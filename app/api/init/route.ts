import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/database';

export async function POST() {
  try {
    console.log('Manual database initialization requested...');
    
    await initDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to initialize database',
    timestamp: new Date().toISOString()
  });
}