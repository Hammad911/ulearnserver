import { NextResponse } from 'next/server';
import { getPoolStats, executeQuery } from '@/app/db';

export async function GET() {
  try {
    const stats = getPoolStats();
    const usagePercent = (stats.inUse / stats.total) * 100;
    
    // Test database connectivity
    let dbTest = 'unknown';
    try {
      const result = await executeQuery('SELECT 1 as test');
      dbTest = 'connected';
    } catch (error) {
      dbTest = 'error';
      console.error('Database test failed:', error);
    }
    
    const healthStatus = {
      status: usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'healthy',
      timestamp: new Date().toISOString(),
      pool: {
        total: stats.total,
        inUse: stats.inUse,
        available: stats.available,
        queueLength: stats.queueLength,
        usagePercent: Math.round(usagePercent * 100) / 100
      },
      database: {
        test: dbTest
      },
      recommendations: [] as string[]
    };
    
    // Add recommendations based on usage
    if (usagePercent > 90) {
      healthStatus.recommendations.push('Database connection pool critically high. Consider increasing connection limit or optimizing queries.');
    } else if (usagePercent > 80) {
      healthStatus.recommendations.push('Database connection pool usage is high. Monitor closely.');
    } else if (usagePercent < 20) {
      healthStatus.recommendations.push('Database connection pool usage is low. Consider reducing connection limit to save resources.');
    }
    
    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('Database health check error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to check database health',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 