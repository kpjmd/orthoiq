import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ensureInitialized } from '@/lib/startup';
import { storeChatMessage, getChatHistory, getChatMessageCount } from '@/lib/database';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MESSAGE_LIMIT = 5;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_CONTEXT_LENGTH = 3000;

// In-memory rate limiting (same pattern as /api/user-feedback)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 12;

function isRateLimited(fid: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(fid) || [];
  const recentRequests = userRequests.filter((time: number) => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  recentRequests.push(now);
  rateLimitMap.set(fid, recentRequests);
  return false;
}

function buildSystemPrompt(consultationData: string, specialistContext: string): string {
  // Truncate consultation context to keep response times fast
  const truncatedContext = consultationData.length > MAX_CONTEXT_LENGTH
    ? consultationData.substring(0, MAX_CONTEXT_LENGTH) + '...[truncated]'
    : consultationData;

  return `You are OrthoTriage Master, a specialized orthopedic AI assistant. You are in a follow-up conversation with a user about their completed ${specialistContext} consultation.

CONSULTATION CONTEXT:
${truncatedContext}

GUIDELINES:
- Keep responses concise (100-200 words)
- Reference findings from the completed consultation when relevant
- Do NOT provide new diagnoses or dramatically different assessments
- If the user asks something beyond the scope of the consultation, politely defer to a healthcare provider
- Be supportive and educational in tone
- You may clarify, elaborate on, or explain the consultation findings in more detail
- Do NOT recommend specific medications or dosages
- Always remind users to consult with a healthcare provider for medical decisions`;
}

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const { consultationId, message, fid, specialistContext = 'triage', consultationData } = body;

    // Validate required fields
    if (!consultationId || !message || !fid) {
      return NextResponse.json(
        { error: 'consultationId, message, and fid are required' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Rate limiting
    if (isRateLimited(fid)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before sending another message.' },
        { status: 429 }
      );
    }

    // Enforce message limit
    const messageCount = await getChatMessageCount(consultationId);
    if (messageCount >= MESSAGE_LIMIT) {
      return NextResponse.json(
        {
          error: 'Message limit reached',
          messageCount: MESSAGE_LIMIT,
          remainingMessages: 0,
          limitReached: true,
        },
        { status: 429 }
      );
    }

    // Load prior chat history
    const chatHistory = await getChatHistory(consultationId);

    // Build messages array for Claude
    const systemPrompt = buildSystemPrompt(
      consultationData || 'No consultation data available.',
      specialistContext
    );

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const msg of chatHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
    messages.push({ role: 'user', content: message });

    // Call Claude API directly
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      temperature: 0.4,
      system: systemPrompt,
      messages,
    });

    const assistantResponse =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Persist messages incrementally (2 INSERTs per exchange)
    await storeChatMessage({
      consultationId,
      fid,
      role: 'user',
      content: message,
      specialistContext,
    });

    await storeChatMessage({
      consultationId,
      fid,
      role: 'assistant',
      content: assistantResponse,
      specialistContext,
    });

    const newMessageCount = messageCount + 1;

    return NextResponse.json({
      response: assistantResponse,
      messageCount: newMessageCount,
      remainingMessages: MESSAGE_LIMIT - newMessageCount,
      limitReached: newMessageCount >= MESSAGE_LIMIT,
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
