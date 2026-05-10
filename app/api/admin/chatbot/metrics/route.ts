import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from '@/lib/adminAuth';

function getSql() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database URL not configured');
  }
  return neon(databaseUrl);
}

export async function GET(_request: NextRequest) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    const sql = getSql();

    // Total consultations (denominator for engagement rate)
    const totalResult = await sql`SELECT COUNT(*) as count FROM consultations`;
    const totalConsultations = Number(totalResult[0]?.count || 0);

    let consultationsWithChat = 0;
    let totalMessages = 0;
    let userMessages = 0;
    let assistantMessages = 0;
    let sessionsLast7Days = 0;
    let messagesLast7Days = 0;
    let sessionTrend: Array<{ date: string; sessions: number }> = [];
    let activityByHour: Array<{ hour: number; count: number }> = [];
    let specialistContextBreakdown: Array<{ context: string; count: number }> = [];
    let perSessionData: Array<{ consultation_id: string; total: number; user: number }> = [];

    try {
      // Consultations with any chat activity
      const chatConsultResult = await sql`
        SELECT COUNT(DISTINCT consultation_id) as count FROM chat_messages
      `;
      consultationsWithChat = Number(chatConsultResult[0]?.count || 0);

      // Total messages by role
      const roleResult = await sql`
        SELECT role, COUNT(*) as count
        FROM chat_messages
        GROUP BY role
      `;
      for (const row of roleResult) {
        totalMessages += Number(row.count);
        if (row.role === 'user') userMessages = Number(row.count);
        if (row.role === 'assistant') assistantMessages = Number(row.count);
      }

      // Per-session message counts (for distribution + avg calculation)
      const perSessionResult = await sql`
        SELECT
          consultation_id,
          COUNT(*) as total_messages,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages
        FROM chat_messages
        GROUP BY consultation_id
      `;
      perSessionData = perSessionResult.map(r => ({
        consultation_id: r.consultation_id,
        total: Number(r.total_messages),
        user: Number(r.user_messages)
      }));

      // 7-day activity
      const recentResult = await sql`
        SELECT
          COUNT(DISTINCT consultation_id) as sessions,
          COUNT(*) as messages
        FROM chat_messages
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      `;
      sessionsLast7Days = Number(recentResult[0]?.sessions || 0);
      messagesLast7Days = Number(recentResult[0]?.messages || 0);

      // 30-day session trend (first message date per consultation)
      const trendResult = await sql`
        SELECT
          TO_CHAR(session_date, 'MM/DD') as date,
          COUNT(*) as sessions
        FROM (
          SELECT consultation_id, DATE(MIN(created_at)) as session_date
          FROM chat_messages
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY consultation_id
        ) sub
        GROUP BY session_date
        ORDER BY session_date ASC
      `;
      sessionTrend = trendResult.map(r => ({ date: r.date, sessions: Number(r.sessions) }));

      // Activity by hour of day
      const hourResult = await sql`
        SELECT
          EXTRACT(HOUR FROM created_at)::INTEGER as hour,
          COUNT(*) as count
        FROM chat_messages
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `;
      activityByHour = hourResult.map(r => ({ hour: Number(r.hour), count: Number(r.count) }));

      // Specialist context breakdown (user messages only)
      const contextResult = await sql`
        SELECT
          COALESCE(specialist_context, 'general') as specialist_context,
          COUNT(*) as count
        FROM chat_messages
        WHERE role = 'user'
        GROUP BY specialist_context
        ORDER BY count DESC
        LIMIT 10
      `;
      specialistContextBreakdown = contextResult.map(r => ({
        context: r.specialist_context,
        count: Number(r.count)
      }));

    } catch (error) {
      console.warn('chat_messages table query error:', error);
    }

    // Compute per-session averages and distribution in JS
    const avgMessagesPerSession = perSessionData.length > 0
      ? Math.round((perSessionData.reduce((s, r) => s + r.total, 0) / perSessionData.length) * 10) / 10
      : 0;
    const avgUserMessagesPerSession = perSessionData.length > 0
      ? Math.round((perSessionData.reduce((s, r) => s + r.user, 0) / perSessionData.length) * 10) / 10
      : 0;

    // Session depth distribution buckets
    const bucket1 = perSessionData.filter(r => r.user <= 2).length;
    const bucket2 = perSessionData.filter(r => r.user >= 3 && r.user <= 5).length;
    const bucket3 = perSessionData.filter(r => r.user >= 6 && r.user <= 10).length;
    const bucket4 = perSessionData.filter(r => r.user >= 11).length;
    const sessionDistribution = [
      { bucket: '1–2 questions', count: bucket1 },
      { bucket: '3–5 questions', count: bucket2 },
      { bucket: '6–10 questions', count: bucket3 },
      { bucket: '11+ questions', count: bucket4 },
    ];

    const chatEngagementRate = totalConsultations > 0
      ? Math.round((consultationsWithChat / totalConsultations) * 1000) / 10
      : 0;

    return NextResponse.json({
      totalConsultations,
      consultationsWithChat,
      chatEngagementRate,
      totalMessages,
      userMessages,
      assistantMessages,
      avgMessagesPerSession,
      avgUserMessagesPerSession,
      sessionDistribution,
      sessionsLast7Days,
      messagesLast7Days,
      sessionTrend,
      activityByHour,
      specialistContextBreakdown,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching chatbot metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatbot metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
