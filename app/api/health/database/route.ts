import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initDatabase } from '@/lib/database';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Test basic connection
    await sql`SELECT 1 as connection_test`;
    const connectionTime = Date.now() - startTime;

    // Check database version and connection info
    const versionResult = await sql`SELECT version()`;
    const version = versionResult.rows[0]?.version || 'Unknown';

    // Check if required tables exist
    const tablesResult = await sql`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name IN ('questions', 'rate_limits')
      ORDER BY table_name, ordinal_position
    `;

    const tables = tablesResult.rows.reduce((acc: any, row) => {
      if (!acc[row.table_name]) {
        acc[row.table_name] = [];
      }
      acc[row.table_name].push({
        column: row.column_name,
        type: row.data_type
      });
      return acc;
    }, {});

    // Check table counts
    const counts: any = {};
    try {
      if (tables.questions) {
        const questionsCount = await sql`SELECT COUNT(*) as count FROM questions`;
        counts.questions = parseInt(questionsCount.rows[0].count);
      }
      if (tables.rate_limits) {
        const rateLimitsCount = await sql`SELECT COUNT(*) as count FROM rate_limits`;
        counts.rate_limits = parseInt(rateLimitsCount.rows[0].count);
      }
    } catch (countError) {
      counts.error = 'Could not retrieve table counts';
    }

    const expectedTables = ['questions', 'rate_limits'];
    const existingTables = Object.keys(tables);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));

    const totalDuration = Date.now() - startTime;
    const status = missingTables.length === 0 ? 'healthy' : 'degraded';

    return NextResponse.json({
      status,
      message: missingTables.length === 0 
        ? `Database healthy (${totalDuration}ms)` 
        : `Database connected but missing tables: ${missingTables.join(', ')}`,
      timestamp: new Date().toISOString(),
      details: {
        connectionTime: `${connectionTime}ms`,
        totalTime: `${totalDuration}ms`,
        version: version.split(' ')[0] + ' ' + version.split(' ')[1], // Simplified version
        tablesFound: existingTables.length,
        tablesExpected: expectedTables.length,
        missingTables,
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
      },
      tables,
      counts
    }, { 
      status: status === 'healthy' ? 200 : 200 // 200 for degraded since connection works
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: {
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
      }
    }, { status: 503 });
  }
}

export async function POST() {
  // Initialize database tables
  try {
    const startTime = Date.now();
    
    await initDatabase();
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'success',
      message: `Database initialized successfully (${duration}ms)`,
      timestamp: new Date().toISOString(),
      details: {
        duration: `${duration}ms`,
        action: 'tables_created_or_verified'
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Database initialization failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}