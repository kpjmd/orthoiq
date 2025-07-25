import { NextRequest, NextResponse } from 'next/server';
import { getOrthoResponse, filterContent } from '@/lib/claude';
import { checkRateLimit, UserTier } from '@/lib/rateLimit';
import { logInteraction, checkRateLimitDB, getResponseStatus } from '@/lib/database';
import { ensureInitialized } from '@/lib/startup';
import { apiLogger, getMetrics } from '@/lib/monitoring';
import { validateOrthopedicContent, validateRateLimitRequest, sanitizeInput } from '@/lib/security';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let requestId = Math.random().toString(36).substring(7);
  const metrics = getMetrics();
  
  try {
    metrics.record('claude_api_request', 1);
    // Ensure database is initialized
    await ensureInitialized();
    
    // Validate environment variables
    const envCheck = validateEnvironment();
    if (!envCheck.valid) {
      apiLogger.error('Environment validation failed', undefined, { requestId, errors: envCheck.errors });
      metrics.record('claude_api_config_error', 1);
      return NextResponse.json(
        { error: 'Server configuration error', details: envCheck.errors },
        { status: 500 }
      );
    }

    apiLogger.info('Claude API request started', { requestId });
    
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { question, fid, authUser, tier } = requestBody;

    if (!question || !fid) {
      console.warn(`[${requestId}] Missing required fields: question=${!!question}, fid=${!!fid}`);
      return NextResponse.json(
        { error: 'Question and FID are required' },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedQuestion = sanitizeInput(question);
    
    // Validate FID format
    const fidValidation = validateRateLimitRequest(fid);
    if (!fidValidation.isValid) {
      console.warn(`[${requestId}] Invalid FID format: ${fid}`);
      return NextResponse.json(
        { error: fidValidation.reason },
        { status: 400 }
      );
    }

    // Enhanced content validation
    const contentValidation = validateOrthopedicContent(sanitizedQuestion);
    if (!contentValidation.isValid) {
      console.log(`[${requestId}] Content validation failed: ${contentValidation.category}`);
      
      // Log filtered interaction
      try {
        await logInteraction(fid, sanitizedQuestion, contentValidation.reason!, true, 0);
        console.log(`[${requestId}] Security filtered interaction logged successfully`);
      } catch (logError) {
        console.error(`[${requestId}] Failed to log security filtered interaction:`, logError);
      }

      return NextResponse.json({
        response: contentValidation.reason,
        isFiltered: true,
        isApproved: false,
        isPendingReview: false,
        reviewedBy: null
      });
    }

    // Use tier from request or determine from authUser
    const userTier: UserTier = tier || 'anonymous';
    console.log(`[${requestId}] Processing question for FID: ${fid}, tier: ${userTier}, length: ${sanitizedQuestion.length}`);

    // Check rate limiting with tier (use in-memory for all environments for now)
    try {
      const rateLimitResult = await checkRateLimit(fid, userTier);
        
      if (!rateLimitResult.allowed) {
        const tierLimits = { anonymous: 1, authenticated: 3, medical: 10 };
        const dailyLimit = tierLimits[userTier];
        console.warn(`[${requestId}] Rate limit exceeded for FID: ${fid}, tier: ${userTier}`);
        return NextResponse.json(
          { 
            error: `Rate limit exceeded. You can ask ${dailyLimit} question${dailyLimit > 1 ? 's' : ''} per day as a ${userTier} user.`,
            resetTime: rateLimitResult.resetTime,
            tier: userTier,
            dailyLimit
          },
          { status: 429 }
        );
      }
      console.log(`[${requestId}] Rate limit check passed for ${userTier} user (${rateLimitResult.remaining} remaining)`);
    } catch (rateLimitError) {
      console.error(`[${requestId}] Rate limit check failed:`, rateLimitError);
      // Continue with request but log the error
    }

    // Get AI response
    let claudeResponse;
    try {
      console.log(`[${requestId}] Calling Claude API...`);
      claudeResponse = await getOrthoResponse(sanitizedQuestion);
      console.log(`[${requestId}] Claude API response received, confidence: ${claudeResponse.confidence}`);
    } catch (claudeError) {
      console.error(`[${requestId}] Claude API call failed:`, claudeError);
      return NextResponse.json(
        { 
          error: 'Failed to get AI response', 
          details: claudeError instanceof Error ? claudeError.message : 'Unknown Claude API error'
        },
        { status: 503 }
      );
    }

    // Log successful interaction
    let questionId: number | null = null;
    try {
      questionId = await logInteraction(fid, sanitizedQuestion, claudeResponse.response, false, claudeResponse.confidence);
      console.log(`[${requestId}] Interaction logged successfully with ID: ${questionId}`);
    } catch (logError) {
      console.error(`[${requestId}] Failed to log interaction:`, logError);
      // Continue even if logging fails
    }

    // Check review status
    let reviewStatus: { 
      isReviewed: boolean; 
      isApproved: boolean; 
      reviewerName?: string;
      reviewType?: string;
      hasAdditions?: boolean;
      hasCorrections?: boolean;
      additionsText?: string;
      correctionsText?: string;
    } = { 
      isReviewed: false, 
      isApproved: false, 
      reviewerName: undefined 
    };
    if (questionId) {
      try {
        reviewStatus = await getResponseStatus(questionId.toString());
      } catch (statusError) {
        console.error(`[${requestId}] Failed to get review status:`, statusError);
      }
    }

    const duration = Date.now() - startTime;
    metrics.record('claude_api_success', 1);
    metrics.record('claude_api_duration', duration);
    metrics.record('claude_api_confidence', claudeResponse.confidence);
    
    apiLogger.info('Request completed successfully', { requestId, duration, confidence: claudeResponse.confidence });

    return NextResponse.json({
      response: claudeResponse.response,
      confidence: claudeResponse.confidence,
      isFiltered: false,
      isApproved: reviewStatus.isApproved,
      isPendingReview: !reviewStatus.isReviewed,
      reviewedBy: reviewStatus.reviewerName,
      reviewType: reviewStatus.reviewType,
      hasAdditions: reviewStatus.hasAdditions,
      hasCorrections: reviewStatus.hasCorrections,
      additionsText: reviewStatus.additionsText,
      correctionsText: reviewStatus.correctionsText
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.record('claude_api_error', 1);
    metrics.record('claude_api_duration', duration);
    
    apiLogger.error('Unexpected error in Claude API route', error, { requestId, duration });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        requestId,
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Environment validation helper
function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY is missing');
  }
  
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is missing');
  }
  
  if (!process.env.NEXT_PUBLIC_HOST) {
    errors.push('NEXT_PUBLIC_HOST is missing');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export async function GET() {
  return NextResponse.json({ message: 'OrthoIQ Claude API is running' });
}