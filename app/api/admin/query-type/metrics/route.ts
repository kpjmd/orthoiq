import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getSql() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database URL not configured');
  }
  return neon(databaseUrl);
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();

    // 1. Totals with averages per query type
    let totals: Array<{
      query_type: string;
      count: number;
      avg_cost: number;
      avg_specialists: number;
      avg_time: number;
    }> = [];
    try {
      const rows = await sql`
        SELECT query_type,
               COUNT(*) as count,
               AVG(total_cost) as avg_cost,
               AVG(specialist_count) as avg_specialists,
               AVG(execution_time) as avg_time
        FROM consultations
        WHERE query_type IS NOT NULL
        GROUP BY query_type
      `;
      totals = rows.map(r => ({
        query_type: r.query_type,
        count: Number(r.count),
        avg_cost: Number(r.avg_cost) || 0,
        avg_specialists: Number(r.avg_specialists) || 0,
        avg_time: Number(r.avg_time) || 0,
      }));
    } catch (e) {
      console.warn('query_type column not available for totals:', e);
    }

    // 2. 30-day trend split by type
    let trend: Array<{ date: string; query_type: string; count: number }> = [];
    try {
      const rows = await sql`
        SELECT DATE(created_at) as date, query_type, COUNT(*) as count
        FROM consultations
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND query_type IS NOT NULL
        GROUP BY DATE(created_at), query_type
        ORDER BY date ASC
      `;
      trend = rows.map(r => ({
        date: String(r.date),
        query_type: r.query_type,
        count: Number(r.count),
      }));
    } catch (e) {
      console.warn('query_type column not available for trend:', e);
    }

    // 3. Recent informational queries (last 10)
    let recentInformational: Array<{
      consultationId: string;
      querySubtype: string | null;
      createdAt: string;
      question: string | null;
    }> = [];
    try {
      const rows = await sql`
        SELECT c.consultation_id, c.query_subtype, c.created_at, q.question
        FROM consultations c
        LEFT JOIN questions q ON c.question_id = q.id
        WHERE c.query_type = 'informational'
        ORDER BY c.created_at DESC
        LIMIT 10
      `;
      recentInformational = rows.map(r => ({
        consultationId: r.consultation_id,
        querySubtype: r.query_subtype || null,
        createdAt: r.created_at,
        question: r.question || null,
      }));
    } catch (e) {
      console.warn('query_type column not available for recent queries:', e);
    }

    return NextResponse.json({
      totals,
      trend,
      recentInformational,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching query-type metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch query-type metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
