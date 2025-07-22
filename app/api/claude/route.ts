import { NextRequest, NextResponse } from 'next/server';
import { getOrthoResponse, filterContent } from '@/lib/claude';
import { checkRateLimit } from '@/lib/rateLimit';
import { logInteraction, checkRateLimitDB } from '@/lib/database';
import { ensureInitialized } from '@/lib/startup';
import { apiLogger, getMetrics } from '@/lib/monitoring';

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

    const { question, fid } = requestBody;

    if (!question || !fid) {
      console.warn(`[${requestId}] Missing required fields: question=${!!question}, fid=${!!fid}`);
      return NextResponse.json(
        { error: 'Question and FID are required' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Processing question for FID: ${fid}, length: ${question.length}`);

    // Check rate limiting (use database in production, in-memory for development)
    try {
      const rateLimitResult = process.env.NODE_ENV === 'production' 
        ? await checkRateLimitDB(fid)
        : await checkRateLimit(fid);
        
      if (!rateLimitResult.allowed) {
        console.warn(`[${requestId}] Rate limit exceeded for FID: ${fid}`);
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. You can ask 1 question per day.',
            resetTime: rateLimitResult.resetTime
          },
          { status: 429 }
        );
      }
      console.log(`[${requestId}] Rate limit check passed (${process.env.NODE_ENV === 'production' ? 'DB' : 'memory'})`);
    } catch (rateLimitError) {
      console.error(`[${requestId}] Rate limit check failed:`, rateLimitError);
      // Continue with request but log the error
    }

    // Filter content for orthopedic relevance
    let isRelevant = true;
    try {
      isRelevant = await filterContent(question);
      console.log(`[${requestId}] Content filtering result: ${isRelevant}`);
    } catch (filterError) {
      console.error(`[${requestId}] Content filtering failed:`, filterError);
      // Default to allowing the question if filtering fails
      isRelevant = true;
    }
    
    if (!isRelevant) {
      const filteredResponse = "I specialize in orthopedic and sports medicine questions only. Please ask about topics like bone/joint injuries, muscle problems, sports injuries, physical therapy, or related medical concerns.";
      
      // Log filtered interaction
      try {
        await logInteraction(fid, question, filteredResponse, true, 0);
        console.log(`[${requestId}] Filtered interaction logged successfully`);
      } catch (logError) {
        console.error(`[${requestId}] Failed to log filtered interaction:`, logError);
      }

      return NextResponse.json({
        response: filteredResponse,
        isFiltered: true
      });
    }

    // Get AI response
    let claudeResponse;
    try {
      console.log(`[${requestId}] Calling Claude API...`);
      claudeResponse = await getOrthoResponse(question);
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
    try {
      await logInteraction(fid, question, claudeResponse.response, false, claudeResponse.confidence);
      console.log(`[${requestId}] Interaction logged successfully`);
    } catch (logError) {
      console.error(`[${requestId}] Failed to log interaction:`, logError);
      // Continue even if logging fails
    }

    const duration = Date.now() - startTime;
    metrics.record('claude_api_success', 1);
    metrics.record('claude_api_duration', duration);
    metrics.record('claude_api_confidence', claudeResponse.confidence);
    
    apiLogger.info('Request completed successfully', { requestId, duration, confidence: claudeResponse.confidence });

    return NextResponse.json({
      response: claudeResponse.response,
      confidence: claudeResponse.confidence,
      isFiltered: false
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