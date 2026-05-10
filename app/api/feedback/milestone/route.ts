import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/monitoring';
import { storeMilestoneFeedback, getConsultation } from '@/lib/database';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    apiLogger.info('Milestone feedback submission started', { requestId });

    const milestoneData = await request.json();

    // Validate required fields
    if (!milestoneData.consultationId || !milestoneData.patientId || milestoneData.milestoneDay === undefined) {
      apiLogger.warn('Invalid milestone data', { requestId, milestoneData });
      return NextResponse.json(
        { error: 'Missing required fields: consultationId, patientId, and milestoneDay' },
        { status: 400 }
      );
    }

    // Verify consultation exists
    const consultation = await getConsultation(milestoneData.consultationId);
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    console.log(`[${requestId}] Milestone feedback received for consultation ${milestoneData.consultationId}, day ${milestoneData.milestoneDay}`);

    // Generate milestone ID
    const milestoneId = `milestone_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Store in local database first
    try {
      await storeMilestoneFeedback({
        milestoneId,
        consultationId: milestoneData.consultationId,
        patientId: milestoneData.patientId,
        milestoneDay: milestoneData.milestoneDay,
        painLevel: milestoneData.progressData?.painLevel,
        functionalScore: milestoneData.progressData?.functionalScore,
        adherence: milestoneData.progressData?.adherence,
        completedInterventions: milestoneData.progressData?.completedInterventions,
        newSymptoms: milestoneData.progressData?.newSymptoms,
        concernFlags: milestoneData.progressData?.concernFlags,
        overallProgress: milestoneData.patientReportedOutcome?.overallProgress,
        satisfactionSoFar: milestoneData.patientReportedOutcome?.satisfactionSoFar,
        difficultiesEncountered: milestoneData.patientReportedOutcome?.difficultiesEncountered
      });
      console.log(`[${requestId}] Milestone feedback stored in database with ID ${milestoneId}`);
    } catch (dbError) {
      console.error(`[${requestId}] Failed to store milestone in database:`, dbError);
      // Continue even if local storage fails
    }

    apiLogger.info('Milestone feedback completed', { requestId, milestoneId });

    return NextResponse.json({
      success: true,
      milestoneId,
      progressStatus: 'pending_analysis'
    });

  } catch (error) {
    apiLogger.error('Milestone feedback submission failed', error as Error, { requestId });
    return NextResponse.json(
      { error: 'Failed to submit milestone feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
