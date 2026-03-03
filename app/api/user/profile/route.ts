import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/database';
import { upsertUserProfile, getUserProfile, getUserPromisHistory } from '@/lib/promisDb';

const MILESTONE_DAYS = [
  { key: '2week', day: 14, label: '2-Week' },
  { key: '4week', day: 28, label: '4-Week' },
  { key: '8week', day: 56, label: '8-Week' },
] as const;

/**
 * GET /api/user/profile?fid=
 * Aggregated user profile: identity, consultations, PROMIS history, pending milestones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json({ error: 'FID is required' }, { status: 400 });
    }

    const sql = getSql();

    // Fetch all data in parallel
    const [profile, consultations, promisHistory, icCountResult] = await Promise.all([
      getUserProfile(fid),
      sql`
        SELECT
          c.consultation_id,
          c.created_at,
          c.mode,
          q.question
        FROM consultations c
        JOIN questions q ON c.question_id = q.id
        WHERE c.fid = ${fid}
        ORDER BY c.created_at DESC
        LIMIT 20
      `,
      getUserPromisHistory(fid),
      sql`SELECT COUNT(*) as count FROM prescriptions WHERE fid = ${fid}`,
    ]);

    // Derive pending milestones from PROMIS baseline consultations
    const completedTimepoints = new Map<string, Set<string>>();
    for (const row of promisHistory) {
      const key = row.consultation_id;
      if (!completedTimepoints.has(key)) {
        completedTimepoints.set(key, new Set());
      }
      completedTimepoints.get(key)!.add(row.timepoint);
    }

    const now = Date.now();
    const pendingMilestones: Array<{
      consultationId: string;
      question: string;
      date: string;
      pendingTimepoints: string[];
    }> = [];

    // Only consultations with a baseline are eligible for follow-up milestones
    for (const [consultationId, timepoints] of completedTimepoints) {
      if (!timepoints.has('baseline')) continue;

      // Find the consultation date from the history
      const consultationRow = promisHistory.find(
        (r: any) => r.consultation_id === consultationId && r.timepoint === 'baseline'
      );
      if (!consultationRow) continue;

      const consultationDate = new Date(consultationRow.consultation_date);
      const daysSince = Math.floor((now - consultationDate.getTime()) / (1000 * 60 * 60 * 24));

      const pending: string[] = [];
      for (const milestone of MILESTONE_DAYS) {
        if (daysSince >= milestone.day && !timepoints.has(milestone.key)) {
          pending.push(milestone.key);
        }
      }

      if (pending.length > 0) {
        pendingMilestones.push({
          consultationId,
          question: consultationRow.consultation_question || 'Unknown',
          date: consultationDate.toISOString(),
          pendingTimepoints: pending,
        });
      }
    }

    return NextResponse.json({
      profile: profile
        ? {
            fid: profile.fid,
            displayName: profile.display_name,
            username: profile.username,
            pfpUrl: profile.pfp_url,
            walletAddress: profile.wallet_address,
            createdAt: profile.created_at,
            lastSeen: profile.last_seen,
          }
        : null,
      stats: {
        totalConsultations: consultations.length,
      },
      consultations: consultations.map((c: any) => ({
        consultationId: c.consultation_id,
        createdAt: c.created_at,
        mode: c.mode,
        question: c.question,
      })),
      intelligenceCards: {
        total: Number(icCountResult[0]?.count || 0),
      },
      promisHistory: promisHistory.map((r: any) => ({
        consultationId: r.consultation_id,
        question: r.consultation_question,
        date: r.consultation_date,
        timepoint: r.timepoint,
        pfTScore: r.physical_function_t_score,
        piTScore: r.pain_interference_t_score,
      })),
      pendingMilestones,
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
  }
}

/**
 * POST /api/user/profile
 * Upsert user profile — fire-and-forget from the client
 */
export async function POST(request: NextRequest) {
  try {
    const { fid, walletAddress, displayName, username, pfpUrl } = await request.json();

    if (!fid) {
      return NextResponse.json({ error: 'FID is required' }, { status: 400 });
    }

    await upsertUserProfile({ fid, walletAddress, displayName, username, pfpUrl });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error upserting user profile:', error);
    return NextResponse.json({ error: 'Failed to upsert user profile' }, { status: 500 });
  }
}
