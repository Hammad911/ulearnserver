import mysql from 'mysql2/promise';

// Singleton connection pool: only create ONCE per app/server
export const dbConfig = {
  host: process.env.DB_HOST || '',
  port: Number(process.env.DB_PORT) || 22473,
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ulearn',
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 20000,
  acquireTimeout: 20000,
  timeout: 20000,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Create the pool ONCE (never per request)
export const pool = mysql.createPool(dbConfig);

// Always use pool.execute (auto-releases connection)
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
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError;
}