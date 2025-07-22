import { NextRequest, NextResponse } from 'next/server';
import { getOrthoResponse, filterContent } from '@/lib/claude';
import { logInteraction } from '@/lib/database';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';

// Only allow debug endpoint in development
function checkDebugAccess() {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  if (!checkDebugAccess()) {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const test = searchParams.get('test') || 'all';

  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {}
  };

  try {
    // Test 1: Environment Variables
    if (test === 'all' || test === 'env') {
      results.tests.environment = {
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
        DATABASE_URL: !!process.env.DATABASE_URL,
        NEXT_PUBLIC_HOST: process.env.NEXT_PUBLIC_HOST || 'not_set',
        NODE_ENV: process.env.NODE_ENV
      };
    }

    // Test 2: Database Connection
    if (test === 'all' || test === 'db') {
      if (!process.env.DATABASE_URL) {
        results.tests.database = {
          status: 'error',
          error: 'DATABASE_URL not configured'
        };
      } else {
        const sql = neon(process.env.DATABASE_URL);
        
        try {
          const dbResult = await sql`SELECT NOW() as current_time`;
          results.tests.database = {
            status: 'connected',
            currentTime: dbResult[0].current_time,
            message: 'Neon database connection successful'
          };
        } catch (dbError) {
          results.tests.database = {
            status: 'error',
            error: dbError instanceof Error ? dbError.message : 'Unknown database error'
          };
        }
      }
    }

    // Test 3: Claude API Basic Connection
    if (test === 'all' || test === 'claude') {
      try {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
        });

        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 20,
          messages: [{ role: 'user', content: 'Say "Hello from debug"' }]
        });

        results.tests.claude_basic = {
          status: 'success',
          response: message.content[0].type === 'text' ? message.content[0].text : 'Non-text response'
        };
      } catch (claudeError) {
        results.tests.claude_basic = {
          status: 'error',
          error: claudeError instanceof Error ? claudeError.message : 'Unknown Claude error'
        };
      }
    }

    // Test 4: Content Filtering
    if (test === 'all' || test === 'filter') {
      try {
        const orthopedicTest = await filterContent('I have knee pain from running');
        const nonOrthopedicTest = await filterContent('What is the capital of France?');
        
        results.tests.content_filtering = {
          status: 'success',
          orthopedic_question: orthopedicTest,
          non_orthopedic_question: nonOrthopedicTest
        };
      } catch (filterError) {
        results.tests.content_filtering = {
          status: 'error',
          error: filterError instanceof Error ? filterError.message : 'Unknown filter error'
        };
      }
    }

    // Test 5: Full Claude Response
    if (test === 'all' || test === 'response') {
      try {
        const response = await getOrthoResponse('What should I do for knee pain after running?');
        results.tests.claude_response = {
          status: 'success',
          confidence: response.confidence,
          isRelevant: response.isRelevant,
          responseLength: response.response.length,
          responseSample: response.response.slice(0, 200) + (response.response.length > 200 ? '...' : '')
        };
      } catch (responseError) {
        results.tests.claude_response = {
          status: 'error',
          error: responseError instanceof Error ? responseError.message : 'Unknown response error'
        };
      }
    }

    // Test 6: Database Logging
    if (test === 'all' || test === 'logging') {
      try {
        await logInteraction('debug-test', 'Debug test question', 'Debug test response', false, 0.8);
        results.tests.database_logging = {
          status: 'success',
          message: 'Test interaction logged successfully'
        };
      } catch (logError) {
        results.tests.database_logging = {
          status: 'error',
          error: logError instanceof Error ? logError.message : 'Unknown logging error'
        };
      }
    }

    // Test 7: Database Tables
    if (test === 'all' || test === 'tables') {
      if (!process.env.DATABASE_URL) {
        results.tests.tables = {
          status: 'error',
          error: 'DATABASE_URL not configured'
        };
      } else {
        const sql = neon(process.env.DATABASE_URL);
        
        try {
          const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
          `;
        
          results.tests.database_tables = {
            status: 'success',
            tables: tables.map((row: any) => row.table_name)
          };
        } catch (tableError) {
          results.tests.database_tables = {
            status: 'error',
            error: tableError instanceof Error ? tableError.message : 'Unknown table error'
          };
        }
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkDebugAccess()) {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { question, fid } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Test the full flow
    const testFid = fid || 'debug-user';
    const startTime = Date.now();

    const results = {
      timestamp: new Date().toISOString(),
      question,
      fid: testFid,
      steps: {} as any
    };

    try {
      // Step 1: Content filtering
      const isRelevant = await filterContent(question);
      results.steps.content_filtering = {
        status: 'success',
        isRelevant,
        duration: Date.now() - startTime
      };

      if (!isRelevant) {
        results.steps.result = {
          response: 'Question was filtered as not orthopedic-related',
          isFiltered: true
        };
        return NextResponse.json(results);
      }

      // Step 2: Get Claude response
      const stepStart = Date.now();
      const claudeResponse = await getOrthoResponse(question);
      results.steps.claude_response = {
        status: 'success',
        confidence: claudeResponse.confidence,
        duration: Date.now() - stepStart
      };

      // Step 3: Log interaction
      const logStart = Date.now();
      await logInteraction(testFid, question, claudeResponse.response, false, claudeResponse.confidence);
      results.steps.database_logging = {
        status: 'success',
        duration: Date.now() - logStart
      };

      results.steps.result = {
        response: claudeResponse.response,
        confidence: claudeResponse.confidence,
        isFiltered: false,
        totalDuration: Date.now() - startTime
      };

      return NextResponse.json(results);

    } catch (stepError) {
      results.steps.error = {
        message: stepError instanceof Error ? stepError.message : 'Unknown error',
        duration: Date.now() - startTime
      };
      return NextResponse.json(results, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      error: 'Debug request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}