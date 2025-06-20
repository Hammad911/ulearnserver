import { createClient } from 'redis';

// Get the Redis URL from environment variables
const redisUrl = process.env.REDIS_URL;

// Ensure the Redis URL is set, otherwise throw an error
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not set. Please add it to your .env.local file or Vercel settings.');
}

const client = createClient({
  url: redisUrl
});

// Handle connection errors
client.on('error', err => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Connected to Redis'));
client.on('ready', () => console.log('Redis client ready'));

// Connect to Redis
client.connect().catch(err => console.error('Redis Connection Error:', err));

// Cache TTL in seconds
const CACHE_TTL = 1800; // 30 minutes

export async function getCachedSearch(query: string, subject: string): Promise<any | null> {
  try {
    const key = `search:${subject}:${query}`;
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCachedSearch(query: string, subject: string, results: any): Promise<void> {
  try {
    const key = `search:${subject}:${query}`;
    await client.setEx(key, CACHE_TTL, JSON.stringify(results));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function getCachedMCQ(query: string, subject: string): Promise<any | null> {
  try {
    const key = `mcq:${subject}:${query}`;
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCachedMCQ(query: string, subject: string, results: any): Promise<void> {
  try {
    const key = `mcq:${subject}:${query}`;
    await client.setEx(key, CACHE_TTL, JSON.stringify(results));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export default client;