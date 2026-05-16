import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSql } from '@/lib/database';
import { getUserPromisHistoryByWebUserId } from '@/lib/promisDb';

const MILESTONE_DAYS = [
  { key: '2week', day: 14, label: '2-Week' },
  { key: '4week', day: 28, label: '4-Week' },
  { key: '8week', day: 56, label: '8-Week' },
] as const;

function computeInitials(email: string | null, walletAddress: string | null): string {
  if (email) {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (local.slice(0, 2) || '?').toUpperCase();
  }
  if (walletAddress) return walletAddress.slice(2, 4).toUpperCase();
  return '??';
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'unauthenticated' },
        { status: 401 }
      );
    }

    const sql = getSql();
    const webUserId = session.user.id;
    const walletAddress = session.user.wallet_address;
    const walletVerified = !!session.user.wallet_verified_at;

    const [consultations, promisHistory, totalCountResult] = await Promise.all([
      walletAddress
        ? sql`
            SELECT
              c.consultation_id, c.created_at, c.mode, c.participating_specialists,
              c.specialist_count, c.tier, c.consensus_percentage, c.total_token_stake,
              c.md_reviewed, c.md_approved, q.question, q.response, q.confidence,
              cf.user_satisfaction
            FROM consultations c
            JOIN questions q ON c.question_id = q.id
            LEFT JOIN consultation_feedback cf ON c.consultation_id = cf.consultation_id
            WHERE c.web_user_id = ${webUserId}
               OR (c.wallet_address IS NOT NULL AND LOWER(c.wallet_address) = LOWER(${walletAddress}))
            ORDER BY c.created_at DESC
            LIMIT 20
          `
        : sql`
            SELECT
              c.consultation_id, c.created_at, c.mode, c.participating_specialists,
              c.specialist_count, c.tier, c.consensus_percentage, c.total_token_stake,
              c.md_reviewed, c.md_approved, q.question, q.response, q.confidence,
              cf.user_satisfaction
            FROM consultations c
            JOIN questions q ON c.question_id = q.id
            LEFT JOIN consultation_feedback cf ON c.consultation_id = cf.consultation_id
            WHERE c.web_user_id = ${webUserId}
            ORDER BY c.created_at DESC
            LIMIT 20
          `,
      getUserPromisHistoryByWebUserId(webUserId, walletAddress),
      walletAddress
        ? sql`
            SELECT COUNT(*) as count FROM consultations
            WHERE (web_user_id = ${webUserId} OR (wallet_address IS NOT NULL AND LOWER(wallet_address) = LOWER(${walletAddress})))
              AND mode = 'normal'
          `
        : sql`
            SELECT COUNT(*) as count FROM consultations
            WHERE web_user_id = ${webUserId} AND mode = 'normal'
          `,
    ]);

    // Pending milestones — derive from PROMIS baseline consultations
    const completedTimepoints = new Map<string, Set<string>>();
    for (const row of promisHistory) {
      const key = row.consultation_id;
      if (!completedTimepoints.has(key)) completedTimepoints.set(key, new Set());
      completedTimepoints.get(key)!.add(row.timepoint);
    }

    const now = Date.now();
    const pendingMilestones: Array<{
      consultationId: string;
      question: string;
      date: string;
      pendingTimepoints: string[];
    }> = [];

    for (const [consultationId, timepoints] of completedTimepoints) {
      if (!timepoints.has('baseline')) continue;

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

    const email = session.user.email;
    const displayName = email ? email.split('@')[0] : null;

    return NextResponse.json({
      profile: {
        kind: 'webUser' as const,
        webUserId: session.user.id,
        email,
        displayName,
        initials: computeInitials(email, walletAddress),
        walletAddress,
        walletVerified,
        createdAt: session.user.created_at,
        lastLogin: session.user.last_login,
      },
      stats: {
        totalConsultations: Number((totalCountResult as any)[0]?.count || 0),
      },
      consultations: (consultations as any[]).map((c: any) => ({
        consultationId: c.consultation_id,
        createdAt: c.created_at,
        mode: c.mode,
        question: c.question,
        ...(c.mode === 'normal'
          ? {
              participatingSpecialists: c.participating_specialists,
              specialistCount: c.specialist_count,
              tier: c.tier,
              consensusPercentage: c.consensus_percentage,
              totalTokenStake: c.total_token_stake,
              mdReviewed: c.md_reviewed,
              mdApproved: c.md_approved,
              confidence: c.confidence,
              responseText: c.response,
              hasFeedback: c.user_satisfaction != null,
            }
          : {}),
      })),
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
    console.error('Error getting web profile:', error);
    return NextResponse.json(
      { error: 'Failed to load profile', code: 'unexpected' },
      { status: 500 }
    );
  }
}
