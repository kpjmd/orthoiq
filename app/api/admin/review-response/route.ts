import { NextRequest, NextResponse } from 'next/server';
import { reviewResponse } from '@/lib/database';
import { sendResponseReviewNotification } from '@/lib/notifications';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { 
      responseId, 
      approved, 
      reviewerFid, 
      reviewerName, 
      notes,
      reviewDetails,
      medicalCategory 
    } = await request.json();

    if (!responseId || approved === undefined || !reviewerFid || !reviewerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In a real app, you'd verify the reviewer is authorized
    const reviewId = await reviewResponse(
      responseId, 
      approved, 
      reviewerFid, 
      reviewerName, 
      notes,
      reviewDetails,
      medicalCategory
    );

    // Get the question details for notification
    const questionResult = await sql`
      SELECT fid, question, response FROM questions 
      WHERE id = ${parseInt(responseId)}
    `;

    if (questionResult.length > 0) {
      const question = questionResult[0];
      
      // Send notification to the user
      try {
        await sendResponseReviewNotification({
          fid: question.fid,
          questionId: responseId,
          isApproved: approved,
          reviewerName,
          question: question.question,
          response: question.response
        });
        console.log(`Notification sent to FID ${question.fid} for question ${responseId}`);
      } catch (notificationError) {
        console.error('Failed to send review notification:', notificationError);
        // Don't fail the review if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      reviewId,
      message: `Response ${approved ? 'approved' : 'rejected'} successfully with enhanced training data`
    });

  } catch (error) {
    console.error('Error reviewing response:', error);
    return NextResponse.json(
      { error: 'Failed to review response' },
      { status: 500 }
    );
  }
}