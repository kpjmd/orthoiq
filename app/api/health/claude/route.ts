import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        status: 'unhealthy',
        message: 'ANTHROPIC_API_KEY not configured',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    const startTime = Date.now();
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Test both models used in the app
    const tests = [
      {
        name: 'Haiku (content filter)',
        model: 'claude-3-haiku-20240307',
        prompt: 'Is this orthopedic related: knee pain? Answer YES or NO.'
      },
      {
        name: 'Sonnet (main responses)',
        model: 'claude-3-sonnet-20240229', 
        prompt: 'Say "Claude API is working"'
      }
    ];

    const results = await Promise.allSettled(
      tests.map(async (test) => {
        const testStartTime = Date.now();
        const message = await anthropic.messages.create({
          model: test.model,
          max_tokens: 50,
          messages: [{ role: 'user', content: test.prompt }]
        });
        
        return {
          ...test,
          duration: Date.now() - testStartTime,
          success: true,
          response: message.content[0].type === 'text' ? message.content[0].text.slice(0, 50) : 'Non-text response'
        };
      })
    );

    const totalDuration = Date.now() - startTime;
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const testResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: 'Unknown test',
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        };
      }
    });

    const overallStatus = failed === 0 ? 'healthy' : (successful > 0 ? 'degraded' : 'unhealthy');

    return NextResponse.json({
      status: overallStatus,
      message: `Claude API check completed: ${successful}/${tests.length} tests passed (${totalDuration}ms)`,
      timestamp: new Date().toISOString(),
      details: {
        totalDuration: `${totalDuration}ms`,
        testsRun: tests.length,
        successful,
        failed,
        apiKeyConfigured: true
      },
      tests: testResults
    }, { 
      status: overallStatus === 'healthy' ? 200 : (overallStatus === 'degraded' ? 200 : 503) 
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      message: 'Claude API health check failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY
      }
    }, { status: 503 });
  }
}

export async function POST() {
  // Allow testing specific prompts
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [{ 
        role: 'user', 
        content: 'Respond with a test message to confirm the API is working.' 
      }]
    });

    return NextResponse.json({
      status: 'success',
      response: message.content[0].type === 'text' ? message.content[0].text : 'Non-text response',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Test call failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}