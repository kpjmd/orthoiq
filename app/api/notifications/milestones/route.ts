import { NextRequest, NextResponse } from 'next/server';
import { getConsultation, getConsultationMilestones } from '@/lib/database';

/**
 * POST /api/notifications/milestones
 * Schedule or send milestone notifications
 * This endpoint can be called by:
 * 1. A cron job to send reminders
 * 2. The frontend to schedule notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultation_id, fid, milestone_days } = body;

    if (!consultation_id || !fid) {
      return NextResponse.json(
        { error: 'Consultation ID and FID are required' },
        { status: 400 }
      );
    }

    // Get consultation details
    const consultation = await getConsultation(consultation_id);

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Get existing milestone feedback
    const milestones = await getConsultationMilestones(consultation_id);
    const completedMilestones = milestones.map(m => m.milestone_day);

    // Standard milestone days: 3, 7, 14, 21, 30
    const standardMilestoneDays: number[] = milestone_days || [3, 7, 14, 21, 30];
    const pendingMilestones = standardMilestoneDays.filter(
      (day: number) => !completedMilestones.includes(day)
    );

    // Calculate days since consultation
    const consultationDate = new Date(consultation.created_at);
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - consultationDate.getTime()) / (1000 * 60 * 60 * 24));

    // Find which milestones are due
    const dueMilestones = pendingMilestones.filter((day: number) => daysSince >= day);

    // In a production environment, this would integrate with:
    // - Farcaster notification system
    // - Push notification service
    // - Email service (for web users who provided email)

    // For now, we return the information about what notifications should be sent
    const notifications = dueMilestones.map((day: number) => ({
      milestone_day: day,
      consultation_id,
      fid,
      message: `Day ${day} Check-in: How is your recovery progressing? Share your feedback to earn tokens and help improve OrthoIQ.`,
      type: 'milestone_reminder',
      created_at: new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      consultation_id,
      fid,
      days_since_consultation: daysSince,
      completed_milestones: completedMilestones,
      pending_milestones: pendingMilestones,
      due_milestones: dueMilestones,
      notifications,
      message: `${notifications.length} milestone notification(s) ready to send`
    });
  } catch (error) {
    console.error('Error processing milestone notifications:', error);
    return NextResponse.json(
      { error: 'Failed to process milestone notifications' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/milestones
 * Get pending milestone notifications for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    // This would query for all consultations by the user and check for pending milestones
    // For now, return a basic structure
    return NextResponse.json({
      fid,
      pending_notifications: [],
      message: 'Check the /api/user/consultations endpoint for consultation history'
    });
  } catch (error) {
    console.error('Error getting milestone notifications:', error);
    return NextResponse.json(
      { error: 'Failed to get milestone notifications' },
      { status: 500 }
    );
  }
}
