import { NextRequest, NextResponse } from 'next/server';

const ORTHOIQ_AGENTS_URL = process.env.ORTHOIQ_AGENTS_URL || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  try {
    const { consultationId } = await params;

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId is required' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const agentsRes = await fetch(`${ORTHOIQ_AGENTS_URL}/research/${consultationId}`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!agentsRes.ok) {
      if (agentsRes.status === 404) {
        return NextResponse.json({ status: 'not_found' });
      }
      const errorText = await agentsRes.text().catch(() => 'Unknown error');
      console.error(`[research/${consultationId}] Agents service returned ${agentsRes.status}: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to fetch research status', status: agentsRes.status },
        { status: agentsRes.status }
      );
    }

    const data = await agentsRes.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Research status request timed out' },
        { status: 504 }
      );
    }

    console.error('[research/status] Error:', error);
    return NextResponse.json(
      { error: 'Research agent service unavailable' },
      { status: 503 }
    );
  }
}
