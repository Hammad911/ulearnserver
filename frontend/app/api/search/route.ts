import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Pinecone } from '@pinecone-database/pinecone'
import { getCachedSearch, setCachedSearch } from '@/lib/redis'

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30 // 30 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  userLimit.count++
  return true
}

// Initialize with error handling
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
})

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' })

// Function to generate embeddings using Gemini
async function generateEmbedding(text: string, maxRetries = 3): Promise<number[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: 'models/embedding-001' })
      const result = await embeddingModel.embedContent(text)
      const embedding = result.embedding
      return Array.isArray(embedding) ? embedding : Object.values(embedding)
    } catch (error) {
      console.error(`Embedding attempt ${attempt + 1} failed:`, error)
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, waitTime))
      } else {
        throw new Error('Failed to generate embedding after all retries')
      }
    }
  }
  throw new Error('Failed to generate embedding')
}

async function connectToPinecone(indexName: string) {
  try {
    // Construct the host URL based on the subject
    const host = `https://${indexName.toLowerCase()}-ofj8ue3.svc.aped-4627-b74a.pinecone.io`
    const index = pc.index(indexName, host)
    console.log(`Successfully connected to Pinecone index: ${indexName} at ${host}`)
    return index
  } catch (error) {
    console.error(`Failed to connect to Pinecone index: ${indexName}`, error)
    throw new Error(`Failed to connect to Pinecone index: ${indexName}`)
  }
}

// Function to check if query is relevant to subject
async function isQueryRelevantToSubject(query: string, subject: string): Promise<boolean> {
  const relevancePrompt = `You are a subject matter expert. Determine if the following question is relevant to ${subject}:

Question: ${query}

Respond with ONLY "YES" if the question is relevant to ${subject}, or "NO" if it's not.
Consider:
1. Is this a topic typically covered in ${subject}?
2. Would a ${subject} textbook likely contain this information?
3. Is this a fundamental concept in ${subject}?
4. Is this a basic definition or concept that should be in any ${subject} textbook?
5. Even if the exact term isn't found, would this be a core concept in ${subject}?

Answer:`;

  try {
    const result = await model.generateContent(relevancePrompt)
    const response = result.response.text().trim().toUpperCase()
    return response === "YES"
  } catch (error) {
    console.error('Error checking query relevance:', error)
    return false
  }
}

export async function POST(req: Request) {
  try {
    // Rate limiting - use IP address as identifier
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const { query, subject } = await req.json()
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    console.log(`[SEARCH] Processing query: "${query}" for subject: "${subject}"`)

    // Check cache first
    console.log(`[CACHE] Checking cache for query: "${query}"`)
    const cachedResults = await getCachedSearch(query, subject)
    if (cachedResults) {
      console.log(`[CACHE] HIT - Returning cached results for query: "${query}"`)
      return NextResponse.json(cachedResults)
    }
    console.log(`[CACHE] MISS - No cached results for query: "${query}"`)

    // First check if query is relevant to subject
    const isRelevant = await isQueryRelevantToSubject(query, subject)

    // Generate embedding for the query
    const embedding = await generateEmbedding(query)

    // Use the subject name directly as the index name
    const indexName = subject.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    // Connect to Pinecone and query
    const index = await connectToPinecone(indexName)
    const queryResponse = await index.namespace('default').query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    })

    // Extract relevant context from Pinecone results
    const context = queryResponse.matches
      .map((match) => match.metadata?.text || '')
      .join('\n\n')

    // Determine if we should use fallback knowledge
    const shouldUseFallback = isRelevant && 
      (queryResponse.matches.length === 0 || 
       queryResponse.matches.every(match => (match.score ?? 0) < 0.5))

    // Generate AI response
    const prompt = shouldUseFallback 
      ? `You are a helpful educational assistant. Answer the following question about ${subject} using your general knowledge. Be concise but informative.

Question: ${query}

Answer:`
      : `You are a helpful educational assistant. Answer the following question about ${subject} using the provided context. If the context doesn't contain enough information, say so and provide a general answer.

Context:
${context}

Question: ${query}

Answer:`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    const searchResults = { 
      results: queryResponse.matches.map(match => ({
        text: match.metadata?.text || '',
        score: match.score,
        chunkNumber: match.metadata?.chunkNumber
      })),
      aiResponse: response,
      usedFallback: shouldUseFallback
    }

    // Cache the results
    console.log(`[CACHE] Setting cache for query: "${query}"`)
    await setCachedSearch(query, subject, searchResults)
    console.log(`[CACHE] Successfully cached results for query: "${query}"`)

    return NextResponse.json(searchResults)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}






