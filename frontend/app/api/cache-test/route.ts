import { NextResponse } from 'next/server';
import { getCachedSearch, setCachedSearch } from '@/lib/redis';

export async function GET() {
  try {
    const testKey = 'test-query';
    const testSubject = 'test-subject';
    const testData = { 
      message: 'Cache test successful', 
      timestamp: new Date().toISOString(),
      data: { test: 'value' }
    };

    // Test setting cache
    console.log('[CACHE-TEST] Setting test data...');
    await setCachedSearch(testKey, testSubject, testData);
    console.log('[CACHE-TEST] Test data set successfully');

    // Test getting cache
    console.log('[CACHE-TEST] Retrieving test data...');
    const retrievedData = await getCachedSearch(testKey, testSubject);
    console.log('[CACHE-TEST] Retrieved data:', retrievedData);

    if (retrievedData && retrievedData.message === testData.message) {
      return NextResponse.json({
        status: 'success',
        message: 'Redis cache is working correctly',
        testData: retrievedData,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Cache retrieval failed or data mismatch',
        expected: testData,
        received: retrievedData,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[CACHE-TEST] Error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Cache test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 