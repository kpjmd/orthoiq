import { NextRequest, NextResponse } from 'next/server';
import { agentsFetch } from '@/lib/agentsClient';

// Proxies the backend's populated-equipoise-cards read endpoint. The live
// consult response carries card skeletons (evidenceLedger: []); this endpoint
// serves the persisted cards with populated ledgers once compilation finishes.
// Mirrors the /api/research/[consultationId] poll proxy.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  try {
    const { consultationId } = await params;
    if (!consultationId) {
      return NextResponse.json({ error: 'consultationId is required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const agentsRes = await agentsFetch(`/consultation/${consultationId}/equipoise-cards`, {
      caller: 'web',
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!agentsRes.ok) {
      if (agentsRes.status === 404) {
        return NextResponse.json({ status: 'not_found', cards: [] });
      }
      const errorText = await agentsRes.text().catch(() => 'Unknown error');
      console.error(`[equipoise-cards/${consultationId}] Agents service returned ${agentsRes.status}: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to fetch equipoise cards', status: agentsRes.status },
        { status: agentsRes.status }
      );
    }

    const data = await agentsRes.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Equipoise cards request timed out' }, { status: 504 });
    }
    console.error('[equipoise-cards] Error:', error);
    return NextResponse.json({ error: 'Equipoise cards service unavailable' }, { status: 503 });
  }
}
