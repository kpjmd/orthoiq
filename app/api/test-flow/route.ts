import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/startup';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    baseUrl: process.env.NEXT_PUBLIC_HOST,
    testStatus: 'running',
    tests: [] as any[]
  };

  try {
    // Test 1: Environment Check
    results.tests.push({
      name: 'Environment Variables',
      status: 'running',
      timestamp: new Date().toISOString()
    });

    const envCheck = {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXT_PUBLIC_HOST: !!process.env.NEXT_PUBLIC_HOST,
      NODE_ENV: process.env.NODE_ENV
    };

    const envMissing = Object.entries(envCheck).filter(([key, value]) => !value && key !== 'NODE_ENV');
    
    results.tests[results.tests.length - 1] = {
      name: 'Environment Variables',
      status: envMissing.length === 0 ? 'passed' : 'failed',
      details: envCheck,
      errors: envMissing.map(([key]) => `${key} is missing`),
      timestamp: new Date().toISOString()
    };

    if (envMissing.length > 0) {
      results.testStatus = 'failed';
      return NextResponse.json(results, { status: 500 });
    }

    // Test 2: Database Initialization
    results.tests.push({
      name: 'Database Initialization',
      status: 'running',
      timestamp: new Date().toISOString()
    });

    try {
      await ensureInitialized();
      results.tests[results.tests.length - 1] = {
        name: 'Database Initialization',
        status: 'passed',
        message: 'Database initialized successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      results.tests[results.tests.length - 1] = {
        name: 'Database Initialization',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      results.testStatus = 'failed';
    }

    // Test 3: Health Check Endpoints
    const healthTests = ['health', 'health/claude', 'health/database'];
    
    for (const endpoint of healthTests) {
      results.tests.push({
        name: `Health Check - ${endpoint}`,
        status: 'running',
        timestamp: new Date().toISOString()
      });

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        results.tests[results.tests.length - 1] = {
          name: `Health Check - ${endpoint}`,
          status: response.ok ? 'passed' : 'failed',
          httpStatus: response.status,
          response: data,
          timestamp: new Date().toISOString()
        };

        if (!response.ok) {
          results.testStatus = 'failed';
        }
      } catch (error) {
        results.tests[results.tests.length - 1] = {
          name: `Health Check - ${endpoint}`,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };
        results.testStatus = 'failed';
      }
    }

    // Test 4: Claude API Endpoint
    results.tests.push({
      name: 'Claude API Test',
      status: 'running',
      timestamp: new Date().toISOString()
    });

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'What should I do for knee pain after running?',
          fid: 'test-user-flow'
        })
      });

      const data = await response.json();
      
      results.tests[results.tests.length - 1] = {
        name: 'Claude API Test',
        status: response.ok ? 'passed' : 'failed',
        httpStatus: response.status,
        hasResponse: !!data.response,
        hasConfidence: typeof data.confidence === 'number',
        isFiltered: !!data.isFiltered,
        responseSample: data.response ? data.response.slice(0, 100) + '...' : null,
        timestamp: new Date().toISOString()
      };

      if (!response.ok) {
        results.testStatus = 'failed';
        results.tests[results.tests.length - 1].error = data.error || 'Unknown API error';
      }
    } catch (error) {
      results.tests[results.tests.length - 1] = {
        name: 'Claude API Test',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      results.testStatus = 'failed';
    }

    // Set final status
    if (results.testStatus !== 'failed') {
      results.testStatus = 'passed';
    }

    const summary = {
      total: results.tests.length,
      passed: results.tests.filter(t => t.status === 'passed').length,
      failed: results.tests.filter(t => t.status === 'failed').length,
      overallStatus: results.testStatus
    };

    return NextResponse.json({
      ...results,
      summary
    }, { 
      status: results.testStatus === 'passed' ? 200 : 500 
    });

  } catch (error) {
    return NextResponse.json({
      ...results,
      testStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      summary: {
        total: results.tests.length,
        passed: results.tests.filter(t => t.status === 'passed').length,
        failed: results.tests.filter(t => t.status === 'failed').length,
        overallStatus: 'error'
      }
    }, { status: 500 });
  }
}

export async function POST() {
  // Run a quick smoke test
  return NextResponse.json({
    message: 'Use GET for full test flow',
    quickTest: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      hasDatabase: !!process.env.DATABASE_URL,
      hasHost: !!process.env.NEXT_PUBLIC_HOST
    }
  });
}