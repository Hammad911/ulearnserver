import { createClient } from 'redis';

// Get Redis configuration from environment variables
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || 'redis-11091.c276.us-east-1-2.ec2.redns.redis-cloud.com';
const redisPort = parseInt(process.env.REDIS_PORT || '11091');
const redisPassword = process.env.REDIS_PASSWORD || 'Mtn5vtm0i6jOHEph3r4lP8aBnBeB6tFQ';

// Create Redis client configuration
let clientConfig: any;

if (redisUrl) {
  // Use REDIS_URL if available
  clientConfig = { url: redisUrl };
} else {
  // Fallback to separate parameters
  clientConfig = {
    socket: {
      host: redisHost,
      port: redisPort,
      tls: true, // Enable SSL/TLS
      rejectUnauthorized: false // Allow self-signed certificates
    },
    password: redisPassword
  };
}

// Create Redis client with retry logic
const client = createClient(clientConfig);

// Handle connection events
client.on('error', err => {
  console.error('Redis Client Error:', err);
  // Don't throw error, just log it for debugging
});

client.on('connect', () => console.log('Connected to Redis'));
client.on('ready', () => console.log('Redis client ready'));
client.on('end', () => console.log('Redis connection ended'));

// Connection management for Vercel
let isConnecting = false;
let connectionPromise: Promise<any> | null = null;

async function ensureConnection(): Promise<void> {
  if (client.isReady) {
    return;
  }
  
  if (isConnecting && connectionPromise) {
    await connectionPromise;
    return;
  }
  
  isConnecting = true;
  connectionPromise = client.connect().catch(err => {
    console.error('Redis Connection Error:', err);
    isConnecting = false;
    connectionPromise = null;
    throw err;
  });
  
  try {
    await connectionPromise;
    isConnecting = false;
    connectionPromise = null;
  } catch (error) {
    isConnecting = false;
    connectionPromise = null;
    throw error;
  }
}

// Cache TTL in seconds
const CACHE_TTL = 1800; // 30 minutes

export async function getCachedSearch(query: string, subject: string): Promise<any | null> {
  try {
    await ensureConnection();
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
    await ensureConnection();
    const key = `search:${subject}:${query}`;
    await client.setEx(key, CACHE_TTL, JSON.stringify(results));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function getCachedMCQ(query: string, subject: string): Promise<any | null> {
  try {
    await ensureConnection();
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
    await ensureConnection();
    const key = `mcq:${subject}:${query}`;
    await client.setEx(key, CACHE_TTL, JSON.stringify(results));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await client.quit();
  process.exit(0);
});

export default client;