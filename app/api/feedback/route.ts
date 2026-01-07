import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/monitoring';
import { storeConsultationFeedback, getConsultation } from '@/lib/database';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    apiLogger.info('Feedback submission started', { requestId });

    const feedbackData = await request.json();

    // Validate required fields for OrthoIQ-Agents schema
    if (!feedbackData.consultationId || !feedbackData.patientId) {
      apiLogger.warn('Invalid feedback data', { requestId, feedbackData });
      return NextResponse.json(
        { error: 'Missing required fields: consultationId and patientId' },
        { status: 400 }
      );
    }

    // Verify consultation exists
    const consultation = await getConsultation(feedbackData.consultationId);
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    console.log(`[${requestId}] Feedback received for consultation ${feedbackData.consultationId}`);

    // Transform feedback data to match OrthoIQ-Agents schema
    const transformedFeedback = {
      consultationId: feedbackData.consultationId,
      patientId: feedbackData.patientId,
      feedback: {
        userSatisfaction: feedbackData.feedback?.userSatisfaction,
        outcomeSuccess: feedbackData.feedback?.outcomeSuccess,
        mdReview: feedbackData.feedback?.mdReview ? {
          approved: feedbackData.feedback.mdReview.approved,
          reviewerName: feedbackData.feedback.mdReview.reviewerName,
          reviewDate: feedbackData.feedback.mdReview.reviewDate,
          specialistAccuracy: feedbackData.feedback.mdReview.specialistAccuracy,
          improvementNotes: feedbackData.feedback.mdReview.improvementNotes
        } : undefined,
        followUpDataProvided: feedbackData.feedback?.followUpDataProvided
      }
    };

    // Store in local database
    try {
      await storeConsultationFeedback({
        consultationId: feedbackData.consultationId,
        patientId: feedbackData.patientId,
        userSatisfaction: feedbackData.feedback?.userSatisfaction,
        outcomeSuccess: feedbackData.feedback?.outcomeSuccess,
        mdReviewApproved: feedbackData.feedback?.mdReview?.approved,
        mdReviewerName: feedbackData.feedback?.mdReview?.reviewerName,
        mdReviewDate: feedbackData.feedback?.mdReview?.reviewDate,
        specialistAccuracy: feedbackData.feedback?.mdReview?.specialistAccuracy,
        improvementNotes: feedbackData.feedback?.mdReview?.improvementNotes,
        painReduction: feedbackData.feedback?.followUpDataProvided?.painReduction,
        functionalImprovement: feedbackData.feedback?.followUpDataProvided?.functionalImprovement,
        adherenceRate: feedbackData.feedback?.followUpDataProvided?.adherenceRate,
        timeToRecovery: feedbackData.feedback?.followUpDataProvided?.timeToRecovery,
        completedPhases: feedbackData.feedback?.followUpDataProvided?.completedPhases
      });
      console.log(`[${requestId}] Feedback stored in database`);
    } catch (dbError) {
      console.error(`[${requestId}] Failed to store feedback in database:`, dbError);
      // Continue even if local storage fails
    }

    // Forward to OrthoIQ-Agents feedback endpoint
    const AGENTS_ENDPOINT = process.env.ORTHOIQ_AGENTS_URL || 'http://localhost:3000';

    let tokenRewards: Array<{agent: string; reward: number; accuracy: number}> = [];

    try {
      const agentsResponse = await fetch(`${AGENTS_ENDPOINT}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformedFeedback),
        signal: AbortSignal.timeout(10000)
      });

      if (agentsResponse.ok) {
        const agentsResult = await agentsResponse.json();
        tokenRewards = agentsResult.tokenRewards || [];
        console.log(`[${requestId}] Feedback forwarded to OrthoIQ-Agents successfully. Token rewards:`, tokenRewards);

        // Update our local record with token rewards
        if (tokenRewards.length > 0) {
          try {
            await storeConsultationFeedback({
              consultationId: feedbackData.consultationId,
              patientId: feedbackData.patientId,
              tokenRewards
            });
          } catch (updateError) {
            console.error(`[${requestId}] Failed to update token rewards:`, updateError);
          }
        }

        // Call prediction resolution endpoint to trigger token distribution
        try {
          const resolutionResponse = await fetch(`${AGENTS_ENDPOINT}/predictions/resolve/user-modal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consultationId: feedbackData.consultationId,
              userFeedback: {
                satisfied: feedbackData.feedback?.outcomeSuccess ?? true,
                painLevel: 5, // Default mid-range if not provided
                confidence: feedbackData.feedback?.userSatisfaction ?? 3,
                timestamp: new Date().toISOString()
              }
            }),
            signal: AbortSignal.timeout(10000)
          });

          if (resolutionResponse.ok) {
            const resolutionResult = await resolutionResponse.json();
            console.log(`[${requestId}] User-modal predictions resolved:`, resolutionResult);
          } else {
            const errorText = await resolutionResponse.text();
            console.warn(`[${requestId}] User-modal prediction resolution failed: ${resolutionResponse.status}`, errorText);
          }
        } catch (resolutionError) {
          console.warn(`[${requestId}] User-modal prediction resolution failed:`, resolutionError);
        }

        apiLogger.info('Feedback submission completed', { requestId, tokenRewards });

        return NextResponse.json({
          success: true,
          message: 'Feedback processed successfully',
          feedbackId: agentsResult.feedbackId,
          tokenRewards: tokenRewards,
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`[${requestId}] Failed to forward feedback to OrthoIQ-Agents: ${agentsResponse.status}`);
        const errorText = await agentsResponse.text();
        console.warn(`[${requestId}] Error details:`, errorText);
      }
    } catch (agentsError) {
      console.warn(`[${requestId}] OrthoIQ-Agents feedback forwarding failed:`, agentsError);
      // Continue even if forwarding fails - we've stored locally
    }

    apiLogger.info('Feedback submission completed (local only)', { requestId });

    return NextResponse.json({
      success: true,
      message: 'Feedback received and stored locally',
      tokenRewards: []
    });

  } catch (error) {
    apiLogger.error('Feedback submission failed', error as Error, { requestId });
    return NextResponse.json(
      { error: 'Failed to submit feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
