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
  connectTimeout: 3000,     // Valid option
  acquireTimeout: 3000,     // Valid option
  waitForConnections: true,
  connectionLimit: 50,      // Conservative limit (leaving 26 for other processes)
  queueLimit: 10,           // Small queue to prevent memory issues
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
  // Add connection reuse optimizations
  multipleStatements: false, // Prevent SQL injection
  dateStrings: true,        // Better date handling
  supportBigNumbers: true,  // Handle large numbers
  bigNumberStrings: true    // Return big numbers as strings
};

// Create the pool ONCE (never per request)
export const pool = mysql.createPool(dbConfig);

// Check MySQL server configuration on startup
console.log('🔧 Database Configuration:');
console.log(`   Connection Limit: ${dbConfig.connectionLimit}`);
console.log(`   Queue Limit: ${dbConfig.queueLimit}`);
console.log('⚠️  WARNING: Your MySQL server has max_connections=76');
console.log('   Recommendation: Increase MySQL max_connections to 200+ for 1000 students');
console.log('   Command: SET GLOBAL max_connections = 200; (requires SUPER privilege)');

// Database connection pool monitoring
export function getPoolStats() {
  try {
    const poolAny = pool as any; // Type assertion for internal properties
    
    // Get actual connection counts from Denque structures
    const allConnectionsCount = poolAny.pool?._allConnections?.size() || 0;
    const freeConnectionsCount = poolAny.pool?._freeConnections?.size() || 0;
    const queueLength = poolAny.pool?._connectionQueue?.size() || 0;
    const totalLimit = poolAny.pool?.config?.connectionLimit || 50;
    
    const stats = {
      total: totalLimit,
      inUse: allConnectionsCount - freeConnectionsCount,
      available: freeConnectionsCount,
      queueLength: queueLength,
      // Add detailed connection info
      allConnections: poolAny.pool?._allConnections || [],
      freeConnections: poolAny.pool?._freeConnections || [],
      connectionQueue: poolAny.pool?._connectionQueue || []
    };
    
    // Log detailed connection info if pool is high
    if (stats.inUse > stats.total * 0.8) {
      console.log('🔍 DETAILED CONNECTION DEBUG:');
      console.log('All connections:', allConnectionsCount);
      console.log('Free connections:', freeConnectionsCount);
      console.log('Queue length:', queueLength);
      console.log('Connection limit:', totalLimit);
      
      // Only try to map if it's an array
      if (Array.isArray(stats.allConnections)) {
        console.log('Connection states:', stats.allConnections.map((conn: any) => ({
          threadId: conn.threadId,
          state: conn.state,
          connected: conn.connected
        })));
      } else {
        console.log('Connection states: Unable to map (not an array)');
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting pool stats:', error);
    return { total: 50, inUse: 0, available: 0, queueLength: 0 };
  }
}

// Monitor connection pool usage
let monitoringInterval: NodeJS.Timeout | null = null;

export function startPoolMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  monitoringInterval = setInterval(() => {
    const stats = getPoolStats();
    const usagePercent = (stats.inUse / stats.total) * 100;
    
    console.log('DB Pool Stats:', {
      ...stats,
      usagePercent: `${usagePercent.toFixed(1)}%`
    });
    
    if (usagePercent > 70) {
      console.warn(`⚠️ Database connection pool at ${usagePercent.toFixed(1)}% capacity!`);
      console.warn('💡 Recommendations:');
      console.warn('   1. Contact your database provider to increase max_connections');
      console.warn('   2. Optimize queries to use fewer connections');
      console.warn('   3. Implement connection pooling at application level');
    }
    
    if (usagePercent > 90) {
      console.error(`🚨 Database connection pool critically high: ${usagePercent.toFixed(1)}%`);
      console.error('🆘 IMMEDIATE ACTION REQUIRED:');
      console.error('   - Reduce application load');
      console.error('   - Contact database provider');
      console.error('   - Consider upgrading database plan');
    }
    
    // Check for connection leaks
    checkForConnectionLeaks();
  }, 15000); // Check every 15 seconds (more frequent monitoring)
}

export function stopPoolMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
}

// Connection leak detection
const connectionTracker = new Map<number, { startTime: number; query: string }>();

// Enhanced query function with connection tracking
export async function executeQuery<T>(query: string, params: any[] = [], maxRetries = 3): Promise<T> {
  let lastError;
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [rows] = await pool.execute(query, params);
      
      // Track connection usage time
      const duration = Date.now() - startTime;
      if (duration > 5000) { // Log slow queries
        console.warn(`🐌 Slow query detected (${duration}ms):`, query.substring(0, 100) + '...');
      }
      
      return rows as T;
    } catch (error) {
      lastError = error;
      console.error(`Query attempt ${attempt} failed:`, error);
      
      // Log pool stats on error
      const stats = getPoolStats();
      console.error('Pool stats on error:', stats);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError;
}

// Enhanced query function with connection management
export async function executeQueryWithConnection<T>(query: string, params: any[] = [], maxRetries = 3): Promise<T> {
  let connection;
  let lastError;
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      connection = await pool.getConnection();
      
      // Track this connection
      const connectionId = Date.now() + Math.random();
      connectionTracker.set(connectionId, { startTime: Date.now(), query: query.substring(0, 50) });
      
      const [rows] = await connection.execute(query, params);
      
      // Remove from tracker
      connectionTracker.delete(connectionId);
      
      // Log slow queries
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        console.warn(`🐌 Slow query with connection (${duration}ms):`, query.substring(0, 100) + '...');
      }
      
      return rows as T;
    } catch (error) {
      lastError = error;
      console.error(`Query attempt ${attempt} failed:`, error);
      
      // Log pool stats on error
      const stats = getPoolStats();
      console.error('Pool stats on error:', stats);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
  throw lastError;
}

// Monitor for connection leaks
function checkForConnectionLeaks() {
  const now = Date.now();
  const leakThreshold = 30000; // 30 seconds
  
  Array.from(connectionTracker.entries()).forEach(([id, info]) => {
    const duration = now - info.startTime;
    if (duration > leakThreshold) {
      console.error(`🚨 CONNECTION LEAK DETECTED! Connection held for ${duration}ms:`, info.query);
      connectionTracker.delete(id);
    }
  });
  
  // Log active connections
  if (connectionTracker.size > 0) {
    console.log(`📊 Active tracked connections: ${connectionTracker.size}`);
  }
}

// Start monitoring when module is loaded
if (typeof window === 'undefined') { // Only on server side
  startPoolMonitoring();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    stopPoolMonitoring();
    pool.end();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    stopPoolMonitoring();
    pool.end();
    process.exit(0);
  });
}

// Enhanced query function with connection batching
export async function executeQueryBatch<T>(queries: Array<{ query: string; params: any[] }>): Promise<T[]> {
  let connection;
  try {
    connection = await pool.getConnection();
    const results = [];
    
    for (const { query, params } of queries) {
      const [rows] = await connection.execute(query, params);
      results.push(rows);
    }
    
    return results as T[];
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Optimized single query with better connection management
export async function executeQueryOptimized<T>(query: string, params: any[] = [], maxRetries = 2): Promise<T> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [rows] = await pool.execute(query, params);
      return rows as T;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error
      if (error.code === 'ER_CON_COUNT_ERROR' || error.message?.includes('Too many connections')) {
        console.error('🚨 Connection pool exhausted! Waiting for available connection...');
        // Wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.error(`Query attempt ${attempt} failed:`, error);
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }
  }
  throw lastError;
}