import { NextRequest, NextResponse } from 'next/server';
import { getOrthoResponse, filterContent } from '@/lib/claude';
import { checkRateLimit, UserTier, checkIPRateLimit, checkPlatformRateLimit, Platform, ConsultationMode } from '@/lib/rateLimit';
import { logInteraction, checkRateLimitDB, checkRateLimitDBWithTiers, getResponseStatus, storeConsultation } from '@/lib/database';
import { ensureInitialized } from '@/lib/startup';
import { apiLogger, getMetrics } from '@/lib/monitoring';
import { validateOrthopedicContent, validateRateLimitRequest, sanitizeInput } from '@/lib/security';
import { localAgentClient } from '@/lib/local-agent-client';

// Register consultation agent for multi-specialist coordination
localAgentClient.registerConsultationAgent().catch(err => {
  console.warn('Failed to register consultation agent:', err);
});

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
    
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check IP-based rate limiting
    const ipRateLimit = await checkIPRateLimit(clientIP);
    if (!ipRateLimit.allowed) {
      console.warn(`[${requestId}] IP rate limit exceeded for: ${clientIP}`);
      metrics.record('claude_api_ip_rate_limit', 1);
      return NextResponse.json(
        { 
          error: 'Too many requests from your IP address. Please try again later.',
          resetTime: ipRateLimit.resetTime
        },
        { status: 429 }
      );
    }
    
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

    const { question, fid, authUser, tier, mode, platform, isEmailVerified, webUser, webSessionId } = requestBody;

    if (!question) {
      console.warn(`[${requestId}] Missing required field: question`);
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Detect platform: miniapp requires FID, web uses session/IP
    const detectedPlatform: Platform = platform || (fid && fid !== 'guest' ? 'miniapp' : 'web');
    // For web users: always prefer webSessionId (persistent across sign-out/in), then webUser.id, then IP
    const rateLimitIdentifier = detectedPlatform === 'miniapp'
      ? fid
      : webSessionId || webUser?.id || `web:${clientIP}`;

    console.log(`[${requestId}] Rate limit identifier: ${rateLimitIdentifier}, webSessionId: ${webSessionId}, webUser.id: ${webUser?.id}, authType: ${webUser?.authType}`);

    if (detectedPlatform === 'miniapp' && !fid) {
      console.warn(`[${requestId}] Mini app requires FID`);
      return NextResponse.json(
        { error: 'Authentication required for mini app' },
        { status: 401 }
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

    // Use tier from request or default to authenticated for miniapp, basic for web
    const userTier: UserTier = tier || (detectedPlatform === 'miniapp' ? 'authenticated' : 'basic');
    const consultationMode: ConsultationMode = mode === 'normal' ? 'comprehensive' : 'fast';

    console.log(`[${requestId}] Processing question - Platform: ${detectedPlatform}, Mode: ${consultationMode}, Tier: ${userTier}, ID: ${rateLimitIdentifier}`);

    // Check platform-aware rate limiting (with email verification for web users)
    let rateLimitResult;
    try {
      rateLimitResult = await checkPlatformRateLimit(
        rateLimitIdentifier,
        detectedPlatform,
        consultationMode,
        userTier,
        isEmailVerified || false // Pass email verification status for web users
      );

      if (!rateLimitResult.allowed) {
        console.warn(`[${requestId}] Rate limit exceeded - Platform: ${detectedPlatform}, Mode: ${consultationMode}, Verified: ${isEmailVerified}`);

        // Use soft notification instead of hard block
        // Return with 200 status but include rate limit info in response
        return NextResponse.json({
          rateLimited: true,
          softWarning: rateLimitResult.softWarning,
          upgradePrompt: rateLimitResult.upgradePrompt,
          resetTime: rateLimitResult.resetTime,
          platform: detectedPlatform,
          mode: consultationMode,
          remaining: 0,
          total: rateLimitResult.total,
          isVerified: rateLimitResult.isVerified
        });
      }
      console.log(`[${requestId}] Rate limit check passed - ${rateLimitResult.remaining}/${rateLimitResult.total} remaining`);
    } catch (rateLimitError) {
      console.error(`[${requestId}] Rate limit check failed:`, rateLimitError);
      // Continue with request but log the error
    }

    // Get AI response from OrthoIQ-Agents (primary) with Claude fallback
    let claudeResponse;
    try {
      const consultationMode = mode === 'normal' ? 'normal' : 'fast'; // Default to fast mode
      console.log(`[${requestId}] Calling OrthoIQ-Agents in ${consultationMode} mode...`);
      claudeResponse = await getOrthoResponse(sanitizedQuestion, requestId, {
        mode: consultationMode,
        userId: fid,
        isReturningUser: false, // TODO: Track returning users
        priorConsultations: [] // TODO: Track consultation history
      });

      // Ensure response is always a string
      if (typeof claudeResponse.response !== 'string') {
        console.log(`[${requestId}] Formatting structured response object`);
        claudeResponse.response = formatStructuredResponse(claudeResponse.response);
      }

      console.log(`[${requestId}] Response received, confidence: ${claudeResponse.confidence}, fromAgents: ${claudeResponse.fromAgentsSystem}`);

      // Check for scope validation (out-of-scope queries) - return early
      if (claudeResponse.isOutOfScope && claudeResponse.scopeValidation) {
        console.log(`[${requestId}] Returning scope validation response: ${claudeResponse.scopeValidation.category}`);
        return NextResponse.json({
          isOutOfScope: true,
          scopeValidation: claudeResponse.scopeValidation,
          confidence: claudeResponse.confidence
        });
      }
    } catch (claudeError) {
      console.error(`[${requestId}] AI system call failed:`, claudeError);
      return NextResponse.json(
        {
          error: 'Failed to get AI response',
          details: claudeError instanceof Error ? claudeError.message : 'Unknown AI system error'
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

    // Extract agent coordination metadata from OrthoIQ-Agents response
    let agentEnrichments: any[] = [];
    let agentCost = 0;
    let agentRouting: any = null;
    let agentPerformance: any = null;
    let specialistConsultation: any = null;
    let agentBadges: any[] = [];

    // Extract metadata from the primary OrthoIQ-Agents consultation
    if (claudeResponse.fromAgentsSystem) {
      const executionTime = Date.now() - startTime;
      console.log(`[${requestId}] Extracting agent coordination metadata from OrthoIQ-Agents response`);

      if (mode === 'fast') {
        // Fast mode: Single triage agent
        agentBadges = [{
          name: 'OrthoTriage Master',
          type: 'triage',
          active: true,
          specialty: 'Triage and Case Coordination'
        }];

        agentRouting = {
          selectedAgent: 'orthoiq-agents-triage',
          routingReason: 'fast_mode_triage',
          alternativeAgents: [],
          networkExecuted: true
        };

        agentPerformance = {
          executionTime,
          successRate: 1.0,
          averageExecutionTime: executionTime,
          totalExecutions: 1,
          specialistCount: 1
        };

        if (claudeResponse.consultationId) {
          specialistConsultation = {
            consultationId: claudeResponse.consultationId,
            participatingSpecialists: ['triage'],
            coordinationSummary: 'Fast triage assessment complete. Full consultation processing in background.',
            specialistCount: 1
          };
        }

      } else {
        // Normal mode: Multiple specialists
        const specialists = claudeResponse.participatingSpecialists || [];

        agentBadges = specialists.map((specialist: string) => ({
          name: getSpecialistDisplayName(specialist),
          type: specialist,
          active: true,
          specialty: getSpecialtyDescription(specialist)
        }));

        agentRouting = {
          selectedAgent: 'orthoiq-consultation',
          routingReason: 'multi_specialist_consultation',
          alternativeAgents: [],
          networkExecuted: true
        };

        agentPerformance = {
          executionTime,
          successRate: 1.0,
          averageExecutionTime: executionTime,
          totalExecutions: 1,
          specialistCount: specialists.length
        };

        if (claudeResponse.consultationId) {
          specialistConsultation = {
            consultationId: claudeResponse.consultationId,
            participatingSpecialists: specialists,
            coordinationSummary: `Multi-specialist consultation with ${specialists.length} specialists`,
            specialistCount: specialists.length
          };
        }

        // Extract individual specialist responses from raw consultation data
        console.log(`[${requestId}] Checking rawConsultationData:`, {
          hasRawData: !!claudeResponse.rawConsultationData,
          hasResponses: !!claudeResponse.rawConsultationData?.responses,
          responsesLength: claudeResponse.rawConsultationData?.responses?.length,
          rawDataKeys: claudeResponse.rawConsultationData ? Object.keys(claudeResponse.rawConsultationData) : []
        });

        if (claudeResponse.rawConsultationData && claudeResponse.rawConsultationData.responses) {
          console.log(`[${requestId}] Extracting ${claudeResponse.rawConsultationData.responses.length} specialist responses`);

          agentEnrichments = claudeResponse.rawConsultationData.responses.map((resp: any) => {
            // resp.response contains the specialist object with nested fields
            const specialist = resp.response || {};
            const specialistType = specialist.specialistType || resp.specialistType || 'specialist';
            const specialistName = specialist.specialist || resp.specialist || getSpecialistDisplayName(specialistType);

            // Extract the narrative response text from specialist.response
            let content = specialist.response || specialist.assessment || '';

            // Handle different content types properly
            if (typeof content === 'object' && content !== null) {
              // If it's an object, try to extract meaningful text or stringify
              if (content.text || content.response || content.assessment) {
                content = content.text || content.response || content.assessment;
              } else {
                // Format as JSON if no text field found
                try {
                  content = JSON.stringify(content, null, 2);
                } catch {
                  content = '[Complex response object]';
                }
              }
            }

            // Ensure content is now a string
            if (typeof content !== 'string') {
              content = String(content);
            }

            // Clean up any JSON code blocks that may still be present from backend
            if (typeof content === 'string') {
              content = content
                .replace(/```json\s*\n/g, '')
                .replace(/```\s*$/g, '')
                .replace(/^```\s*/g, '');
            }

            // Add recommendations if available (nested in specialist object)
            const recommendations = specialist.recommendations || resp.recommendations;
            if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
              content += '\n\n**Recommendations:**\n';
              recommendations.forEach((rec: any, idx: number) => {
                const intervention = rec.intervention || rec;
                const timeline = rec.timeline || '';
                content += `${idx + 1}. ${intervention}${timeline ? ` - ${timeline}` : ''}\n`;
              });
            }

            return {
              type: 'consultation' as const,
              title: specialistName,
              content: content,
              metadata: {
                specialist: specialistType,
                agentType: specialistType,
                confidence: specialist.confidence || resp.confidence || 0.85,
                responseTime: specialist.responseTime || resp.responseTime,
                agreementWithTriage: specialist.agreementWithTriage || resp.agreementWithTriage
              }
            };
          });

          console.log(`[${requestId}] Extracted ${agentEnrichments.length} specialist enrichments`);
        }
      }

      // Store consultation in database
      if (questionId && specialistConsultation?.consultationId) {
        try {
          await storeConsultation({
            consultationId: specialistConsultation.consultationId,
            questionId: questionId,
            fid: fid,
            webUserId: webUser?.id,
            mode: (mode === 'normal' ? 'normal' : 'fast') as 'fast' | 'normal',
            participatingSpecialists: specialistConsultation.participatingSpecialists,
            coordinationSummary: specialistConsultation.coordinationSummary,
            specialistCount: specialistConsultation.specialistCount,
            totalCost: agentCost,
            executionTime: executionTime
          });
          console.log(`[${requestId}] Consultation ${specialistConsultation.consultationId} stored in database`);
        } catch (storeError) {
          console.error(`[${requestId}] Failed to store consultation:`, storeError);
          // Don't fail the request if storage fails
        }
      }

      console.log(`[${requestId}] Agent metadata extracted: ${agentBadges.length} specialists, mode: ${mode}`);
    }

    const duration = Date.now() - startTime;
    metrics.record('claude_api_success', 1);
    metrics.record('claude_api_duration', duration);
    metrics.record('claude_api_confidence', claudeResponse.confidence);
    
    apiLogger.info('Request completed successfully', { requestId, duration, confidence: claudeResponse.confidence });

    // Get current network statistics (placeholder for now)
    const networkStats = {
      activeAgents: agentBadges.length,
      totalCapacity: 5,
      totalLoad: agentBadges.length,
      messageQueueSize: 0
    };
    
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
      correctionsText: reviewStatus.correctionsText,
      inquiry: claudeResponse.inquiry,
      keyPoints: claudeResponse.keyPoints,
      questionId: questionId,
      // Agent enrichments
      enrichments: agentEnrichments,
      agentCost: agentCost,
      hasResearch: agentEnrichments.some(e => e.type === 'research' || e.type === 'consultation'),
      userTier: userTier,
      // Specialist consultation data
      specialistConsultation: specialistConsultation,
      agentBadges: agentBadges,
      hasSpecialistConsultation: specialistConsultation !== null,
      // Raw consultation data for Intelligence Card generation
      rawConsultationData: claudeResponse.rawConsultationData || (mode === 'fast' && specialistConsultation ? {
        consultationId: specialistConsultation.consultationId,
        participatingSpecialists: ['triage'],
        responses: [{
          response: {
            specialistType: 'triage',
            specialist: 'OrthoTriage Master',
            confidence: claudeResponse.confidence || 0.85,
            response: claudeResponse.response
          }
        }],
        synthesizedRecommendations: {
          confidenceFactors: {
            overallConfidence: claudeResponse.confidence || 0.85,
            interAgentAgreement: 0.85
          }
        }
      } : undefined),
      // Agent coordination fields
      agentNetwork: {
        activeAgents: networkStats.activeAgents,
        totalCapacity: networkStats.totalCapacity,
        currentLoad: networkStats.totalLoad,
        networkUtilization: networkStats.totalCapacity > 0
          ? (networkStats.totalLoad / networkStats.totalCapacity)
          : 0
      },
      agentRouting: agentRouting,
      agentPerformance: agentPerformance,
      coordinationMetadata: {
        networkId: agentRouting?.networkExecuted ? 'consultation' : 'default',
        messageQueueDepth: networkStats.messageQueueSize,
        taskId: `${requestId}_${questionId}`,
        executionMode: agentRouting?.networkExecuted ? 'consultation_coordinated' : 'direct_orchestrator'
      }
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

// Helper function to format structured response objects into readable text
function formatStructuredResponse(obj: any): string {
  if (typeof obj === 'string') return obj;

  // Handle structured medical response format
  if (obj && typeof obj === 'object') {
    const sections = [];

    // ===== OrthoIQ-Agents Specialist Response Format =====
    // Extract the main response field if present
    if (obj.response && typeof obj.response === 'string') {
      sections.push(obj.response);
    }

    // Format recommendations as clean bulleted list
    if (obj.recommendations && Array.isArray(obj.recommendations)) {
      const recommendationsText = obj.recommendations.map((rec: any) => {
        if (typeof rec === 'string') return `• ${rec}`;
        if (rec && typeof rec === 'object') {
          const parts = [];

          // Add intervention name
          if (rec.intervention) {
            parts.push(rec.intervention);
          }

          // Add priority badge
          if (rec.priority !== undefined) {
            const priorityLabels = ['Low', 'Medium', 'High', 'Critical'];
            const priorityLabel = priorityLabels[Math.min(rec.priority, 3)] || `Priority ${rec.priority}`;
            parts.push(`[${priorityLabel} Priority]`);
          }

          // Add evidence grade
          if (rec.evidenceGrade) {
            parts.push(`(Grade ${rec.evidenceGrade} Evidence)`);
          }

          // Add timeline if present
          if (rec.timeline) {
            parts.push(`Timeline: ${rec.timeline}`);
          }

          return parts.length > 0 ? `• ${parts.join(' - ')}` : '';
        }
        return '';
      }).filter(Boolean).join('\n');

      if (recommendationsText) {
        sections.push(`\n**Recommendations:**\n${recommendationsText}`);
      }
    }

    // Note: Technical metadata (timestamp, responseTime, agreementWithTriage, status,
    // specialist, specialistType, confidence) is intentionally NOT displayed here

    // ===== Legacy Medical Response Format =====
    if (obj.diagnosis) {
      sections.push(`**Diagnosis:**\n${obj.diagnosis}`);
    }

    if (obj.immediate_actions) {
      sections.push(`**Immediate Actions:**\n${obj.immediate_actions}`);
    }

    if (obj.red_flags) {
      sections.push(`**Red Flags:**\n${obj.red_flags}`);
    }

    if (obj.specialist_recommendation) {
      sections.push(`**Specialist Recommendation:**\n${obj.specialist_recommendation}`);
    }

    if (obj.followup) {
      sections.push(`**Follow-up:**\n${obj.followup}`);
    }

    // If it's a structured object with these fields, format them
    if (sections.length > 0) {
      return sections.join('\n\n');
    }

    // Otherwise, try to stringify it
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  return String(obj);
}

// Helper functions for specialist display
function getSpecialistDisplayName(specialist: string): string {
  const names: { [key: string]: string } = {
    'triage': 'OrthoTriage Master',
    'painWhisperer': 'Pain Whisperer',
    'movementDetective': 'Movement Detective',
    'strengthSage': 'Strength Sage',
    'mindMender': 'Mind Mender'
  };
  return names[specialist] || specialist;
}

function getSpecialtyDescription(specialist: string): string {
  const descriptions: { [key: string]: string } = {
    'triage': 'Triage and Case Coordination',
    'painWhisperer': 'Pain Management and Assessment',
    'movementDetective': 'Biomechanics and Movement Analysis',
    'strengthSage': 'Functional Restoration and Rehabilitation',
    'mindMender': 'Psychological Aspects of Recovery'
  };
  return descriptions[specialist] || 'Medical Specialist';
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