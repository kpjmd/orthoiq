import { NextRequest, NextResponse } from 'next/server';
import { getConsultation, getConsultationMilestones } from '@/lib/database';

// Helper function to calculate days since consultation
function calculateDaysSince(createdAt: string | Date): number {
  const consultationDate = new Date(createdAt);
  const today = new Date();
  return Math.floor((today.getTime() - consultationDate.getTime()) / (1000 * 60 * 60 * 24));
}

// Milestone schedule: 2, 4, 8 weeks
const MILESTONE_DAYS = [14, 28, 56] as const;

// Determine current milestone based on days since consultation and completed milestones
function determineCurrentMilestone(
  daysSince: number,
  completedMilestones: number[]
): { day: number; type: 'pain' | 'functional' | 'movement'; status: 'due' | 'upcoming' | 'past' } | null {
  for (const day of MILESTONE_DAYS) {
    if (!completedMilestones.includes(day)) {
      const type = day === 14 ? 'pain' : day === 28 ? 'functional' : 'movement';
      const status = daysSince >= day ? 'due' : 'upcoming';
      return { day, type, status };
    }
  }
  return null; // All milestones completed
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    // Load consultation
    const consultation = await getConsultation(caseId);
    if (!consultation) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // Load existing milestones
    const milestones = await getConsultationMilestones(caseId);
    const completedMilestoneDays = milestones.map((m: any) => m.milestone_day);

    // Calculate timing
    const daysSince = calculateDaysSince(consultation.created_at);
    const currentMilestone = determineCurrentMilestone(daysSince, completedMilestoneDays);

    // Build milestone status for each day
    const milestoneStatus = MILESTONE_DAYS.map(day => {
      const completed = completedMilestoneDays.includes(day);
      const milestoneData = milestones.find((m: any) => m.milestone_day === day);
      return {
        day,
        type: day === 14 ? 'pain' : day === 28 ? 'functional' : 'movement',
        label: day === 14 ? 'Week 2 - Pain' : day === 28 ? 'Week 4 - Functional' : 'Week 8 - Movement',
        completed,
        due: !completed && daysSince >= day,
        data: milestoneData || null
      };
    });

    // Parse participating specialists from JSONB
    let specialists: string[] = [];
    try {
      if (consultation.participating_specialists) {
        specialists = typeof consultation.participating_specialists === 'string'
          ? JSON.parse(consultation.participating_specialists)
          : consultation.participating_specialists;
      }
    } catch {
      specialists = [];
    }

    return NextResponse.json({
      success: true,
      consultation: {
        caseId: consultation.consultation_id,
        questionId: consultation.question_id,
        fid: consultation.fid,
        mode: consultation.mode,
        specialists,
        specialistCount: consultation.specialist_count,
        coordinationSummary: consultation.coordination_summary,
        isPrivate: consultation.is_private || false,
        createdAt: consultation.created_at
      },
      milestones: milestoneStatus,
      daysSince,
      currentMilestone,
      completedCount: completedMilestoneDays.length,
      totalMilestones: MILESTONE_DAYS.length
    });

  } catch (error) {
    console.error('Error getting track data:', error);
    return NextResponse.json(
      { error: 'Failed to get tracking data' },
      { status: 500 }
    );
  }
}
