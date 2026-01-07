import { NextRequest, NextResponse } from 'next/server';
import { storeMilestoneFeedback, getConsultation } from '@/lib/database';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    console.log(`[${requestId}] Predictions follow-up resolution started`);

    const body = await request.json();
    const { consultationId, followUpData, milestoneDay, timestamp } = body;

    // Validate required fields
    if (!consultationId || !followUpData || milestoneDay === undefined) {
      console.warn(`[${requestId}] Invalid follow-up data`, { consultationId, milestoneDay });
      return NextResponse.json(
        { error: 'Missing required fields: consultationId, followUpData, and milestoneDay' },
        { status: 400 }
      );
    }

    // Verify consultation exists
    const consultation = await getConsultation(consultationId);
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    console.log(`[${requestId}] Follow-up received for consultation ${consultationId}, day ${milestoneDay}`);

    // Generate milestone ID
    const milestoneId = `follow_up_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Store in local database first
    try {
      await storeMilestoneFeedback({
        milestoneId,
        consultationId,
        patientId: consultation.fid,
        milestoneDay,
        painLevel: followUpData.painLevel,
        functionalScore: followUpData.functionalScore,
        adherence: followUpData.adherence,
        completedInterventions: followUpData.completedInterventions,
        newSymptoms: followUpData.newSymptoms,
        concernFlags: followUpData.concernFlags,
        overallProgress: followUpData.overallProgress,
        satisfactionSoFar: followUpData.satisfactionSoFar,
        difficultiesEncountered: followUpData.difficultiesEncountered
      });
      console.log(`[${requestId}] Follow-up stored in database with ID ${milestoneId}`);
    } catch (dbError) {
      console.error(`[${requestId}] Failed to store follow-up in database:`, dbError);
      // Continue even if local storage fails
    }

    // Forward to OrthoIQ-Agents predictions resolve endpoint
    const AGENTS_ENDPOINT = process.env.ORTHOIQ_AGENTS_URL || 'http://localhost:3000';

    try {
      const agentsResponse = await fetch(`${AGENTS_ENDPOINT}/predictions/resolve/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          followUpData: {
            painLevel: followUpData.painLevel ?? 5,
            functionalImprovement: followUpData.functionalScore ?? 50,
            returnedToActivity: followUpData.overallProgress === 'improving',
            adherenceRate: (followUpData.adherence ?? 0.8) * 100,
            daysSinceConsultation: milestoneDay,
            timestamp: timestamp || new Date().toISOString()
          }
        }),
        signal: AbortSignal.timeout(15000) // 15 second timeout for prediction resolution
      });

      if (agentsResponse.ok) {
        const agentsResult = await agentsResponse.json();
        console.log(`[${requestId}] Predictions resolved successfully via OrthoIQ-Agents`);

        // Update local record with validation results
        try {
          await storeMilestoneFeedback({
            milestoneId: agentsResult.milestoneId || milestoneId,
            consultationId,
            patientId: consultation.fid,
            milestoneDay,
            painLevel: followUpData.painLevel,
            functionalScore: followUpData.functionalScore,
            adherence: followUpData.adherence,
            completedInterventions: followUpData.completedInterventions,
            newSymptoms: followUpData.newSymptoms,
            concernFlags: followUpData.concernFlags,
            overallProgress: followUpData.overallProgress,
            milestoneAchieved: agentsResult.validationResults?.predictionsValidated?.length > 0,
            progressStatus: agentsResult.progressStatus || 'validated',
            tokenReward: agentsResult.validationResults?.tokenDistribution
              ? Object.values(agentsResult.validationResults.tokenDistribution).reduce((a: number, b: any) => a + (b || 0), 0)
              : 0,
            reassessmentTriggered: false,
            adjustedRecommendations: agentsResult.adjustedRecommendations
          });
        } catch (updateError) {
          console.error(`[${requestId}] Failed to update milestone with validation results:`, updateError);
        }

        return NextResponse.json({
          success: true,
          milestoneId: agentsResult.milestoneId || milestoneId,
          validationResults: agentsResult.validationResults || {
            agentAccuracy: {},
            predictionsValidated: [],
            tokenDistribution: {}
          },
          cardTierUpdate: agentsResult.cardTierUpdate,
          progressStatus: agentsResult.progressStatus || 'validated',
          message: 'Predictions resolved and validated successfully'
        });
      } else {
        const errorText = await agentsResponse.text();
        console.warn(`[${requestId}] Failed to resolve predictions via OrthoIQ-Agents: ${agentsResponse.status}`, errorText);
      }
    } catch (agentsError) {
      console.warn(`[${requestId}] OrthoIQ-Agents prediction resolution failed:`, agentsError);
      // Continue even if forwarding fails - we've stored locally
    }

    // Return success with local data only (backend unavailable)
    console.log(`[${requestId}] Follow-up completed (local only) for milestone ${milestoneId}`);

    return NextResponse.json({
      success: true,
      milestoneId,
      validationResults: {
        agentAccuracy: {},
        predictionsValidated: [],
        tokenDistribution: {}
      },
      progressStatus: 'pending_validation',
      message: 'Follow-up data received. Prediction validation pending backend processing.'
    });

  } catch (error) {
    console.error(`[${requestId}] Predictions follow-up resolution failed:`, error);
    return NextResponse.json(
      { error: 'Failed to resolve predictions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
