import { NextRequest, NextResponse } from 'next/server';

const ORTHOIQ_AGENTS_URL = process.env.ORTHOIQ_AGENTS_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultationId, caseData, consultationResult, userTier } = body;

    if (!consultationId || !caseData) {
      return NextResponse.json(
        { error: 'consultationId and caseData are required' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const agentsRes = await fetch(`${ORTHOIQ_AGENTS_URL}/research/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultationId, caseData, consultationResult, userTier }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!agentsRes.ok) {
      const errorText = await agentsRes.text().catch(() => 'Unknown error');
      console.error(`[research/trigger] Agents service returned ${agentsRes.status}: ${errorText}`);
      return NextResponse.json(
        { error: 'Research trigger failed', status: agentsRes.status },
        { status: agentsRes.status }
      );
    }

    const data = await agentsRes.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Research agent request timed out' },
        { status: 504 }
      );
    }

    console.error('[research/trigger] Error:', error);
    return NextResponse.json(
      { error: 'Research agent service unavailable' },
      { status: 503 }
    );
  }
}
