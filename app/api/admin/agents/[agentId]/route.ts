import { NextRequest, NextResponse } from 'next/server';

const AGENTS_ENDPOINT = process.env.ORTHOIQ_AGENTS_URL || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Proxy to orthoiq-agents backend
    const response = await fetch(`${AGENTS_ENDPOINT}/predictions/agent/${agentId}`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`orthoiq-agents returned ${response.status}: ${errorText}`);

      // Return fallback data if backend is unavailable
      return NextResponse.json(
        {
          agentId,
          agentName: agentId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          backendAvailable: false,
          message: 'Agent statistics unavailable. orthoiq-agents backend may be offline.'
        },
        { status: 503 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      ...data,
      backendAvailable: true
    });

  } catch (error) {
    console.error('Error fetching agent details:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch agent details',
        details: error instanceof Error ? error.message : 'Unknown error',
        backendAvailable: false
      },
      { status: 500 }
    );
  }
}
