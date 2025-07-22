import { NextRequest, NextResponse } from 'next/server';
import { getOrthoResponse, filterContent } from '@/lib/claude';
import { checkRateLimit } from '@/lib/rateLimit';
import { logInteraction } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { question, fid } = await request.json();

    if (!question || !fid) {
      return NextResponse.json(
        { error: 'Question and FID are required' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(fid);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. You can ask 1 question per day.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // Filter content for orthopedic relevance
    const isRelevant = await filterContent(question);
    if (!isRelevant) {
      const filteredResponse = "I specialize in orthopedic and sports medicine questions only. Please ask about topics like bone/joint injuries, muscle problems, sports injuries, physical therapy, or related medical concerns.";
      
      // Log filtered interaction
      try {
        await logInteraction(fid, question, filteredResponse, true, 0);
      } catch (logError) {
        console.error('Failed to log filtered interaction:', logError);
      }

      return NextResponse.json({
        response: filteredResponse,
        isFiltered: true
      });
    }

    // Get AI response
    const claudeResponse = await getOrthoResponse(question);

    // Log successful interaction
    try {
      await logInteraction(fid, question, claudeResponse.response, false, claudeResponse.confidence);
    } catch (logError) {
      console.error('Failed to log interaction:', logError);
      // Continue even if logging fails
    }

    return NextResponse.json({
      response: claudeResponse.response,
      confidence: claudeResponse.confidence,
      isFiltered: false
    });

  } catch (error) {
    console.error('Error in Claude API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'OrthoIQ Claude API is running' });
}