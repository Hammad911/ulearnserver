import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCachedMCQ, setCachedMCQ } from '@/lib/redis';

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

// Function to extract a concise topic name using Gemini
async function extractTopic(query: string): Promise<string> {
  const topicPrompt = `Given the following question, extract the main topic or concept in 1-3 words. Return only the topic name, nothing else.\n\nQuestion: ${query}`;
  const result = await model.generateContent(topicPrompt);
  return result.response.text().trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
}

export async function POST(req: Request) {
  try {
    const { query, subject } = await req.json();
    console.log('Received request:', { query, subject });

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cachedResults = await getCachedMCQ(query, subject);
    if (cachedResults) {
      console.log('Returning cached results');
      return NextResponse.json(cachedResults);
    }

    // Extract topic using Gemini
    console.log('Extracting topic...');
    const topic = await extractTopic(query);
    console.log('Extracted topic:', topic);

    // Analyze query requirements
    console.log('Analyzing query requirements...');
    const requirements = await analyzeQueryRequirements(query);
    const { isNumerical, difficulty, focus } = requirements;
    console.log('Query requirements:', requirements);

    // Generate embedding for the query
    console.log('Generating embedding...');
    const embedding = await generateEmbedding(query);
    console.log('Embedding generated, length:', embedding.length);

    // Use the subject name directly as the index name
    const indexName = subject.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    console.log('Using index:', indexName);

    // Connect to Pinecone and query
    console.log('Connecting to Pinecone...');
    const index = await connectToPinecone(indexName);

    // Get valid count from index stats
    console.log('Getting index stats...');
    const stats = await index.describeIndexStats();
    const validCount = stats.totalRecordCount || 0;
    console.log('Index stats:', stats);

    // Query all namespaces in parallel for physics
    console.log('Querying Pinecone...');
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
      console.log('Found chapter namespaces:', chapterNamespaces);
      
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
    console.log('Found matches:', allMatches.length);

    // Extract relevant context
    const context = allMatches
      .map((match) => match.metadata?.text || '')
      .join('\n\n');
    console.log('Context length:', context.length);

    // Create a prompt for the AI
    const prompt = `You are an educational MCQ generator. Generate 5 multiple-choice questions based on the following context and requirements:\n\nContext:\n${context}\n\nRequirements:\n- Difficulty: ${difficulty}\n- Numerical: ${isNumerical ? 'Yes' : 'No'}\n- Focus areas: ${focus.join(', ')}\n\nInstructions:\n- Generate questions that test understanding of the concepts in the context\n- Each question should have 4 options (A, B, C, D)\n- Only one option should be correct\n- Make the incorrect options plausible but clearly wrong\n- For numerical questions, include calculations and formulas\n- For conceptual questions, focus on key definitions and relationships\n- Ensure questions are at the specified difficulty level\n- Include explanations for the correct answers\n\nIMPORTANT: Return a valid JSON array with exactly this structure:\n[\n  {\n    "question": "Question text here",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "answer": "A",\n    "explanation": "Explanation here"\n  }\n]\n\nDo not include any additional text, markdown formatting, or code blocks. Return ONLY the JSON array.`;

    // Get response from Gemini
    console.log('Generating MCQs with Gemini...');
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log('Raw Gemini response:', response);
    
    // Clean up the response and ensure it's valid JSON
    let jsonStr = response.trim();
    
    // Remove any markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();
    
    // If the response starts with a newline or whitespace, remove it
    jsonStr = jsonStr.replace(/^\s+/, '');
    
    // If the response doesn't start with '[', try to find the start of the array
    if (!jsonStr.startsWith('[')) {
      const arrayStart = jsonStr.indexOf('[');
      if (arrayStart !== -1) {
        jsonStr = jsonStr.slice(arrayStart);
      }
    }
    
    console.log('Cleaned JSON string:', jsonStr);
    
    try {
      const mcqs = JSON.parse(jsonStr);
      console.log('Parsed MCQs:', mcqs);
      
      // Validate the structure
      if (!Array.isArray(mcqs)) {
        throw new Error('Response is not an array');
      }
      
      // Validate each MCQ
      mcqs.forEach((mcq, index) => {
        if (!mcq.question || !Array.isArray(mcq.options) || mcq.options.length !== 4 || !mcq.answer || !mcq.explanation) {
          throw new Error(`Invalid MCQ structure at index ${index}`);
        }
      });
      
      const mcqResults = {
        questions: mcqs.map(mcq => ({
          question: mcq.question,
          options: mcq.options,
          answer: mcq.answer,
          explanation: mcq.explanation
        })),
        requirements: {
          isNumerical,
          difficulty,
          focus
        },
        topic // Use the concise topic name
      };

      // Cache the results
      console.log('Caching results...');
      await setCachedMCQ(query, subject, mcqResults);

      return NextResponse.json(mcqResults);
    } catch (error) {
      console.error('Error parsing MCQ response:', error);
      console.error('Raw response:', response);
      return NextResponse.json(
        { error: 'Failed to generate MCQs: Invalid response format' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('MCQ generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate MCQs' },
      { status: 500 }
    );
  }
}
