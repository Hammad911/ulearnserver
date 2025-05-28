import mysql from 'mysql2/promise';

// Database connection configuration
export const dbConfig = {
  host: process.env.DB_HOST || 'ulearnsql-ulearn-quiz.d.aivencloud.com',
  port: Number(process.env.DB_PORT) || 22473,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || 'AVNS_emLP_3XGXfY7uoGC4Em',
  database: process.env.DB_NAME || 'ulearn',
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 20000, // 20 seconds
  acquireTimeout: 20000, // 20 seconds
  timeout: 20000, // 20 seconds
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Create a connection pool
export const pool = mysql.createPool(dbConfig);

// Helper function to execute queries with retry logic
export async function executeQuery<T>(query: string, params: any[] = [], maxRetries = 3): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [rows] = await pool.execute(query, params);
      return rows as T;
    } catch (error) {
      lastError = error;
      console.error(`Query attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError;
} 