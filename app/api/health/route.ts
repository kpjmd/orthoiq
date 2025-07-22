import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      environment: await checkEnvironment(),
      database: await checkDatabase(),
      claude: await checkClaude(),
    }
  };

  // Determine overall health status
  const allChecksHealthy = Object.values(healthCheck.checks).every(check => check.status === 'healthy');
  healthCheck.status = allChecksHealthy ? 'healthy' : 'unhealthy';

  const statusCode = allChecksHealthy ? 200 : 503;
  
  return NextResponse.json(healthCheck, { status: statusCode });
}

async function checkEnvironment() {
  const requiredVars = ['ANTHROPIC_API_KEY', 'DATABASE_URL', 'NEXT_PUBLIC_HOST'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    status: missing.length === 0 ? 'healthy' : 'unhealthy',
    message: missing.length === 0 
      ? 'All required environment variables are set' 
      : `Missing environment variables: ${missing.join(', ')}`,
    details: {
      required: requiredVars.length,
      missing: missing.length,
      present: requiredVars.length - missing.length
    }
  };
}

async function checkDatabase() {
  try {
    const startTime = Date.now();
    
    // Test basic connection
    await sql`SELECT 1 as test`;
    
    // Check if required tables exist
    const tablesExist = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('questions', 'rate_limits')
    `;
    
    const duration = Date.now() - startTime;
    const expectedTables = ['questions', 'rate_limits'];
    const existingTables = tablesExist.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    return {
      status: missingTables.length === 0 ? 'healthy' : 'degraded',
      message: missingTables.length === 0 
        ? `Database connection successful (${duration}ms)` 
        : `Database connected but missing tables: ${missingTables.join(', ')}`,
      details: {
        responseTime: `${duration}ms`,
        tablesFound: existingTables.length,
        tablesExpected: expectedTables.length,
        missingTables: missingTables
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

async function checkClaude() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        status: 'unhealthy',
        message: 'ANTHROPIC_API_KEY not configured'
      };
    }

    const startTime = Date.now();
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Test with a simple query
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "OK"' }]
    });

    const duration = Date.now() - startTime;
    
    return {
      status: 'healthy',
      message: `Claude API responding (${duration}ms)`,
      details: {
        responseTime: `${duration}ms`,
        model: 'claude-3-haiku-20240307',
        apiKeyConfigured: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Claude API call failed',
      error: error instanceof Error ? error.message : 'Unknown Claude API error'
    };
  }
}