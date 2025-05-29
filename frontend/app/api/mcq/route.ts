import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with error handling
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, { embedding: number[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Function to analyze query requirements
async function analyzeQueryRequirements(query: string): Promise<{
  isNumerical: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  focus: string[];
}> {
  const analysisPrompt = `Analyze the following query and determine:
1. If it requests numerical questions (look for words like "numerical", "calculation", "solve", "compute")
2. The difficulty level (easy, medium, or hard)
3. Any specific focus areas (like "formulas", "concepts", "applications")

Query: "${query}"

Return ONLY a JSON object in this exact format, with no markdown formatting or additional text:
{
  "isNumerical": true/false,
  "difficulty": "easy/medium/hard",
  "focus": ["area1", "area2"]
}`;

  const result = await model.generateContent(analysisPrompt);
  const responseText = result.response.text().trim();
  const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
  
  try {
    const analysis = JSON.parse(jsonStr);
    return {
      isNumerical: analysis.isNumerical ?? false,
      difficulty: analysis.difficulty ?? 'medium',
      focus: Array.isArray(analysis.focus) ? analysis.focus : []
    };
  } catch (error) {
    console.error('Error parsing requirements:', error);
    return {
      isNumerical: false,
      difficulty: 'medium',
      focus: []
    };
  }
}

// Function to generate embeddings using Gemini with caching
async function generateEmbedding(text: string, maxRetries = 3): Promise<number[]> {
  // Check cache first
  const cached = embeddingCache.get(text);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.embedding;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: 'models/embedding-001' });
      const result = await embeddingModel.embedContent(text);
      const embedding = Array.isArray(result.embedding) ? result.embedding : Object.values(result.embedding);
      
      // Cache the result
      embeddingCache.set(text, { embedding, timestamp: Date.now() });
      return embedding;
    } catch (error) {
      console.error(`Embedding attempt ${attempt + 1} failed:`, error);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } else {
        throw new Error('Failed to generate embedding after all retries');
      }
    }
  }
  throw new Error('Failed to generate embedding');
}

async function connectToPinecone(indexName: string) {
  try {
    const host = `https://${indexName.toLowerCase()}-ofj8ue3.svc.aped-4627-b74a.pinecone.io`;
    const index = pc.index(indexName, host);
    return index;
  } catch (error) {
    console.error(`Failed to connect to Pinecone index: ${indexName}`, error);
    throw new Error(`Failed to connect to Pinecone index: ${indexName}`);
  }
}

export async function POST(req: Request) {
  try {
    const { query, count = 5, subject } = await req.json();

    if (!query || !subject) {
      return NextResponse.json(
        { error: 'Query and subject are required' },
        { status: 400 }
      );
    }

    // Run these operations in parallel
    const [requirements, embedding, index] = await Promise.all([
      analyzeQueryRequirements(query),
      generateEmbedding(query),
      connectToPinecone(subject)
    ]);

    // Extract topic and validate count in parallel
    const [topicResult, validCount] = await Promise.all([
      model.generateContent(`Given the following query about ${subject}, extract the main topic or concept being asked about. Return only the topic name, nothing else. Query: "${query}"`),
      Promise.resolve(Math.min(Math.max(parseInt(count.toString()), 1), 20))
    ]);

    if (isNaN(validCount)) {
      return NextResponse.json(
        { error: 'Invalid MCQ count' },
        { status: 400 }
      );
    }

    const topic = topicResult.response.text().trim();

    // Optimize context retrieval
    let allMatches = [];
    if (subject === 'physics') {
      const [stats, defaultQuery] = await Promise.all([
        index.describeIndexStats(),
        index.namespace('default').query({
          vector: embedding,
          topK: Math.min(validCount * 2, 20),
          includeMetadata: true,
        })
      ]);

      const chapterNamespaces = Object.keys(stats.namespaces || {}).filter(ns => ns.startsWith('chapter_'));
      
      // Query all namespaces in parallel
      const namespaceQueries = await Promise.all(
        chapterNamespaces.map(ns => 
          index.namespace(ns).query({
            vector: embedding,
            topK: Math.min(validCount * 2, 20),
            includeMetadata: true,
          })
        )
      );

      allMatches = [
        ...(defaultQuery.matches || []),
        ...namespaceQueries.flatMap(q => q.matches || [])
      ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
       .slice(0, Math.min(validCount * 2, 20));
    } else {
      const queryResponse = await index.namespace('default').query({
        vector: embedding,
        topK: Math.min(validCount * 2, 20),
        includeMetadata: true,
      });
      allMatches = queryResponse.matches || [];
    }

    // Extract relevant context
    const context = allMatches
      .map((match) => match.metadata?.text || '')
      .join('\n\n');

    // Create optimized prompt
    const prompt = `Based on the following context from ${subject} textbooks, generate ${validCount} multiple-choice questions. Each question should have 4 options (A, B, C, D) with one correct answer. Mark the correct answer with an asterisk (*).

Requirements:
${requirements.isNumerical ? '- Generate numerical questions that require calculations and problem-solving.' : ''}
- Difficulty level: ${requirements.difficulty}
${requirements.focus.length > 0 ? `- Focus areas: ${requirements.focus.join(', ')}` : ''}

Instructions:
- Do NOT reference the context, "provided text," or "according to the passage."
- Each question must be fully self-contained and understandable on its own.
- Do NOT use phrases like "according to the above," "based on the context," or similar.
- Write each question as it would appear in a real exam.
${requirements.isNumerical ? '- Include necessary values and units in the questions.' : ''}

Format each question like this:
Question 1: [Question text]
Options:
A) [Option 1]
B) [Option 2]
C) [Option 3]*
D) [Option 4]

Context:
${context}

Generate ${validCount} MCQs that test understanding of the key concepts in the context. Make sure the questions are clear, the options are plausible, and only one answer is correct.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return NextResponse.json({ 
      response,
      topic,
      requirements
    });
  } catch (error) {
    console.error('MCQ generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate MCQs' },
      { status: 500 }
    );
  }
}
