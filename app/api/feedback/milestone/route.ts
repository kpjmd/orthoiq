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

    // Transform milestone data for OrthoIQ-Agents schema
    const transformedMilestone = {
      consultationId: milestoneData.consultationId,
      patientId: milestoneData.patientId,
      milestoneDay: milestoneData.milestoneDay,
      progressData: milestoneData.progressData || {},
      patientReportedOutcome: milestoneData.patientReportedOutcome || {}
    };

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

    // Forward to OrthoIQ-Agents milestone endpoint
    const AGENTS_ENDPOINT = process.env.ORTHOIQ_AGENTS_URL || 'http://localhost:3000';

    try {
      const agentsResponse = await fetch(`${AGENTS_ENDPOINT}/feedback/milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformedMilestone),
        signal: AbortSignal.timeout(10000)
      });

      if (agentsResponse.ok) {
        const agentsResult = await agentsResponse.json();
        console.log(`[${requestId}] Milestone feedback forwarded to OrthoIQ-Agents successfully`);

        // Update local record with agent response data
        try {
          await storeMilestoneFeedback({
            milestoneId: agentsResult.milestoneId || milestoneId,
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
            difficultiesEncountered: milestoneData.patientReportedOutcome?.difficultiesEncountered,
            milestoneAchieved: agentsResult.milestoneAchieved,
            progressStatus: agentsResult.progressStatus,
            tokenReward: agentsResult.tokenReward?.amount || 0,
            reassessmentTriggered: agentsResult.reassessmentTriggered,
            adjustedRecommendations: agentsResult.adjustedRecommendations,
            nextMilestoneDay: agentsResult.nextMilestone?.day,
            encouragement: agentsResult.encouragement
          });
        } catch (updateError) {
          console.error(`[${requestId}] Failed to update milestone with agent response:`, updateError);
        }

        apiLogger.info('Milestone feedback completed', { requestId, milestoneId: agentsResult.milestoneId });

        return NextResponse.json({
          success: true,
          milestoneId: agentsResult.milestoneId || milestoneId,
          milestoneAchieved: agentsResult.milestoneAchieved,
          progressStatus: agentsResult.progressStatus,
          tokenReward: agentsResult.tokenReward,
          reassessmentTriggered: agentsResult.reassessmentTriggered,
          adjustedRecommendations: agentsResult.adjustedRecommendations,
          nextMilestone: agentsResult.nextMilestone,
          encouragement: agentsResult.encouragement
        });
      } else {
        console.warn(`[${requestId}] Failed to forward milestone to OrthoIQ-Agents: ${agentsResponse.status}`);
        const errorText = await agentsResponse.text();
        console.warn(`[${requestId}] Error details:`, errorText);
      }
    } catch (agentsError) {
      console.warn(`[${requestId}] OrthoIQ-Agents milestone forwarding failed:`, agentsError);
      // Continue even if forwarding fails - we've stored locally
    }

    apiLogger.info('Milestone feedback completed (local only)', { requestId, milestoneId });

    // Return success with local data only
    return NextResponse.json({
      success: true,
      milestoneId,
      message: 'Milestone feedback received and stored locally',
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
