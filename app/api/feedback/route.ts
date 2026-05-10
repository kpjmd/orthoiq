import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/monitoring';
import { storeConsultationFeedback, getConsultation, getSql } from '@/lib/database';
import { agentsFetch } from '@/lib/agentsClient';
import { getSession } from '@/lib/session';

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

    // Ownership check: verify the caller owns this consultation
    const session = await getSession();
    if (consultation.web_user_id) {
      // Web consultation: must have a valid session matching the owner
      if (!session || session.user.id !== consultation.web_user_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (consultation.fid) {
      // Farcaster consultation: patientId must match the consultation's FID
      const claimedFid = feedbackData.patientId?.toString();
      if (!claimedFid || claimedFid !== consultation.fid.toString()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
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

      // Flag consultation for MD review if user requested it
      if (feedbackData.feedback?.mdReview) {
        try {
          const sql = getSql();
          await sql`
            UPDATE consultations
            SET requires_md_review = true
            WHERE consultation_id = ${feedbackData.consultationId}
          `;
          console.log(`[${requestId}] Consultation ${feedbackData.consultationId} flagged for MD review (user-requested)`);
        } catch (flagError) {
          console.error(`[${requestId}] Failed to flag for MD review:`, flagError);
        }
      }
    } catch (dbError) {
      console.error(`[${requestId}] Failed to store feedback in database:`, dbError);
      // Continue even if local storage fails
    }

    // Trigger prediction resolution (best-effort — does not block the response)
    try {
      const resolutionResponse = await agentsFetch('/predictions/resolve/user-modal', {
        caller: 'web',
        method: 'POST',
        body: JSON.stringify({
          consultationId: feedbackData.consultationId,
          userFeedback: {
            satisfied: feedbackData.feedback?.outcomeSuccess ?? true,
            painLevel: 5,
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

    apiLogger.info('Feedback submission completed', { requestId });

    return NextResponse.json({
      success: true,
      message: 'Feedback processed successfully',
      tokenRewards: [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    apiLogger.error('Feedback submission failed', error as Error, { requestId });
    return NextResponse.json(
      { error: 'Failed to submit feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
