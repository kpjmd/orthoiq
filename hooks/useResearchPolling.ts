'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ResearchState } from '@/lib/types';
import { triggerResearch, pollResearch } from '@/lib/researchService';

interface UseResearchPollingOptions {
  enabled: boolean;
  consultationId?: string;
  caseData?: any;
  consultationResult?: any;
  userTier?: string;
}

export function useResearchPolling({
  enabled,
  consultationId,
  caseData,
  consultationResult,
  userTier,
}: UseResearchPollingOptions) {
  const [researchState, setResearchState] = useState<ResearchState>({
    status: 'idle',
    result: null,
    error: null,
  });
  const [isPolling, setIsPolling] = useState(false);
  const abortRef = useRef(false);
  const triggeredRef = useRef<string | null>(null);

  const runResearch = useCallback(async () => {
    if (!consultationId || !caseData) return;

    // Prevent duplicate triggers for the same consultationId
    if (triggeredRef.current === consultationId) return;
    triggeredRef.current = consultationId;

    abortRef.current = false;
    setResearchState({ status: 'pending', result: null, error: null });
    setIsPolling(true);

    // Trigger
    const triggerResult = await triggerResearch({
      consultationId,
      caseData,
      consultationResult,
      userTier,
    });

    if (abortRef.current) return;

    if (!triggerResult.success) {
      setResearchState({ status: 'failed', result: null, error: triggerResult.error || 'Trigger failed' });
      setIsPolling(false);
      return;
    }

    // Poll
    const result = await pollResearch(consultationId);

    if (abortRef.current) return;

    if (!result) {
      setResearchState({ status: 'failed', result: null, error: 'Research timed out' });
    } else if (result.status === 'failed') {
      setResearchState({ status: 'failed', result, error: result.error || 'Research failed' });
    } else {
      setResearchState({ status: 'complete', result, error: null });
    }

    setIsPolling(false);
  }, [consultationId, caseData, consultationResult, userTier]);

  useEffect(() => {
    if (enabled && consultationId && caseData) {
      runResearch();
    }

    return () => {
      abortRef.current = true;
    };
  }, [enabled, consultationId, runResearch, caseData]);

  const retrigger = useCallback(() => {
    triggeredRef.current = null;
    runResearch();
  }, [runResearch]);

  return { researchState, isPolling, retrigger };
}
