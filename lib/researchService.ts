import { ResearchResult, ResearchCitation, ResearchStatus, ResearchState } from './types';

export interface TriggerResearchParams {
  consultationId: string;
  caseData: any;
  consultationResult?: any;
  userTier?: string;
}

export async function triggerResearch(params: TriggerResearchParams): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/research/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Normalize the agents backend research response into the frontend ResearchResult shape.
 * Handles both the polling wrapper ({ status, research: {...} }) and the inline shape ({ intro, citations, ... }).
 */
export function normalizeResearchResponse(data: any, consultationId: string): ResearchResult {
  const research = data.research || data;

  const citations: ResearchCitation[] = (research.citations || []).map((c: any) => ({
    pmid: c.pmid || '',
    title: c.title || '',
    authors: Array.isArray(c.authors)
      ? c.authors
      : typeof c.authors === 'string'
        ? c.authors.split(', ').filter(Boolean)
        : Array.isArray(c.rawAuthors) ? c.rawAuthors : [],
    journal: c.journal || '',
    year: typeof c.year === 'number' ? c.year : parseInt(c.year) || 0,
    quality: typeof c.qualityScore === 'number'
      ? (c.qualityScore >= 8 ? 'high' : c.qualityScore >= 5 ? 'moderate' : 'low')
      : (c.quality || 'moderate') as 'high' | 'moderate' | 'low',
    relevanceScore: c.relevanceScore || 0,
    abstract: c.abstract,
    pubmedUrl: c.pubmedUrl || '',
  }));

  return {
    consultationId,
    status: 'complete',
    intro: research.intro,
    citations,
    totalStudiesFound: citations.length,
    searchTerms: Array.isArray(research.searchTerms)
      ? research.searchTerms
      : research.searchQuery ? [research.searchQuery] : [],
  };
}

export interface PollResearchOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export async function pollResearch(
  consultationId: string,
  options: PollResearchOptions = {}
): Promise<ResearchResult | null> {
  const { intervalMs = 3000, timeoutMs = 60000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`/api/research/${consultationId}`);

      if (!res.ok) {
        // If service is unavailable, keep polling
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      const data = await res.json();

      if (data.status === 'complete') {
        return normalizeResearchResponse(data, consultationId);
      }

      if (data.status === 'failed') {
        return { consultationId, status: 'failed', citations: [], totalStudiesFound: 0, searchTerms: [], error: data.error } as ResearchResult;
      }

      // Still pending / not_found — wait and poll again
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch {
      // Network error, wait and try again
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  // Timed out
  return null;
}

export type { ResearchResult, ResearchStatus, ResearchState };
