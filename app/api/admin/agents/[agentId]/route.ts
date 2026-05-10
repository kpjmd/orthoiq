import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

// The per-agent prediction stats endpoint was removed in the Phase 3 backend audit.
// This route returns a static "unavailable" response; the UI will be removed in Task 3.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  const { agentId } = await params;

  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }

  return NextResponse.json(
    {
      agentId,
      agentName: agentId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      backendAvailable: false,
      message: 'Per-agent prediction statistics have been removed. UI cleanup pending in Task 3.'
    },
    { status: 503 }
  );
}
