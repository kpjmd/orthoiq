import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '@/lib/monitoring';
import { getAnalytics } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('window') || '3600000'); // 1 hour default
    
    const metrics = getMetrics();
    const summary = metrics.getMetricsSummary(timeWindow);
    const recentMetrics = metrics.getMetrics().slice(-50); // Last 50 metrics
    
    // Get database analytics
    let dbAnalytics;
    try {
      dbAnalytics = await getAnalytics();
    } catch (error) {
      dbAnalytics = {
        error: 'Failed to fetch database analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    const monitoring = {
      timestamp: new Date().toISOString(),
      timeWindow,
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV,
        memoryUsage: process.memoryUsage()
      },
      metrics: {
        summary,
        recent: recentMetrics
      },
      database: dbAnalytics
    };

    return NextResponse.json(monitoring);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch monitoring data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow manual metric recording for testing
  try {
    const { name, value, labels } = await request.json();
    
    if (!name || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Name and numeric value are required' },
        { status: 400 }
      );
    }

    const metrics = getMetrics();
    metrics.record(name, value, labels);

    return NextResponse.json({
      success: true,
      message: `Metric '${name}' recorded with value ${value}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to record metric',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}