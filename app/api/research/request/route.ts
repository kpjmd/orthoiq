import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator } from '@/lib/agentOrchestrator';
import { ResearchSynthesisAgent } from '@/lib/agents/researchSynthesisAgent';
import { getUserResearchQuota, updateResearchUsage, storeResearchSynthesis } from '@/lib/database';
import { checkRateLimitDBWithTiers } from '@/lib/database';
import { ResearchRarity } from '@/lib/types';

// Register the research synthesis agent
const researchAgent = new ResearchSynthesisAgent();
agentOrchestrator.registerAgent(researchAgent);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, fid, userTier = 'authenticated', questionId } = body;

    if (!question || !fid) {
      return NextResponse.json(
        { error: 'Question and FID are required' },
        { status: 400 }
      );
    }

    // Check basic rate limits first
    const rateLimit = await checkRateLimitDBWithTiers(fid, userTier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          resetTime: rateLimit.resetTime,
          remaining: rateLimit.remaining,
          tier: rateLimit.tier
        },
        { status: 429 }
      );
    }

    // Check research quota for premium tiers
    if (['scholar', 'practitioner', 'institution'].includes(userTier)) {
      const quota = await getUserResearchQuota(fid);
      if (!quota) {
        return NextResponse.json(
          { error: 'No active research subscription found' },
          { status: 403 }
        );
      }

      // Determine which tier of research to generate
      let targetTier: ResearchRarity = 'bronze';
      let quotaField: 'bronzeUsed' | 'silverUsed' | 'goldUsed' = 'bronzeUsed';
      let quotaLimit: number = quota.bronzeQuota;

      if (userTier === 'institution' && quota.goldUsed < quota.goldQuota) {
        targetTier = 'gold';
        quotaField = 'goldUsed';
        quotaLimit = quota.goldQuota;
      } else if (['practitioner', 'institution'].includes(userTier) && quota.silverUsed < quota.silverQuota) {
        targetTier = 'silver';
        quotaField = 'silverUsed';  
        quotaLimit = quota.silverQuota;
      } else if (quota.bronzeUsed < quota.bronzeQuota) {
        targetTier = 'bronze';
        quotaField = 'bronzeUsed';
        quotaLimit = quota.bronzeQuota;
      } else {
        return NextResponse.json(
          { 
            error: 'Research quota exceeded',
            quota: {
              tier: quota.tier,
              bronzeUsed: quota.bronzeUsed,
              bronzeLimit: quota.bronzeQuota,
              silverUsed: quota.silverUsed,
              silverLimit: quota.silverQuota,
              goldUsed: quota.goldUsed,
              goldLimit: quota.goldQuota,
              resetDate: quota.resetDate
            }
          },
          { status: 429 }
        );
      }
    }

    // Estimate cost for the research request
    const context = {
      question,
      fid,
      userTier,
      questionId,
      metadata: { requestType: 'research', targetTier: userTier === 'authenticated' ? 'bronze' : userTier }
    };

    const estimatedCost = agentOrchestrator.estimateCost(context);
    console.log(`Estimated cost for research request: $${estimatedCost}`);

    // Execute research synthesis agent
    console.log(`Processing research request for ${userTier} user: ${fid}`);
    const result = await agentOrchestrator.executeAgents(context, ['research-synthesis']);

    if (result.errors.length > 0) {
      console.error('Research synthesis errors:', result.errors);
      return NextResponse.json(
        { 
          error: 'Research synthesis failed',
          details: result.errors,
          totalCost: result.totalCost
        },
        { status: 500 }
      );
    }

    if (result.enrichments.length === 0) {
      return NextResponse.json(
        { 
          error: 'No research enrichments generated',
          totalCost: result.totalCost
        },
        { status: 404 }
      );
    }

    const enrichment = result.enrichments[0]; // First research enrichment
    
    // Store research synthesis in database if we have a question ID
    if (questionId && enrichment.metadata?.searchQuery) {
      try {
        // This would typically come from the agent result
        const synthesisMock = {
          id: `research_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          query: enrichment.metadata.searchQuery,
          papers: [], // Would be populated by real agent
          synthesis: enrichment.content,
          keyFindings: ['Research synthesis generated'],
          limitations: ['Simulated data for MVP'],
          clinicalRelevance: 'Educational information for orthopedic conditions',
          evidenceStrength: enrichment.metadata.evidenceStrength || 'moderate',
          generatedAt: new Date(),
          mdReviewed: false
        };
        
        await storeResearchSynthesis(synthesisMock, questionId);
      } catch (storeError) {
        console.warn('Failed to store research synthesis:', storeError);
        // Don't fail the request if storage fails
      }
    }

    // Update usage quota for premium users
    if (['scholar', 'practitioner', 'institution'].includes(userTier)) {
      try {
        const quotaTier = enrichment.rarityTier || 'bronze';
        await updateResearchUsage(fid, quotaTier as 'bronze' | 'silver' | 'gold');
      } catch (quotaError) {
        console.warn('Failed to update research quota:', quotaError);
        // Don't fail the request if quota update fails
      }
    }

    // Format response
    const response = {
      success: true,
      research: {
        title: enrichment.title,
        content: enrichment.content,
        rarity: enrichment.rarityTier,
        metadata: {
          studyCount: enrichment.metadata?.studyCount || 0,
          evidenceStrength: enrichment.metadata?.evidenceStrength || 'moderate',
          publicationYears: enrichment.metadata?.publicationYears || 'unknown',
          nftEligible: enrichment.nftEligible || false
        }
      },
      totalCost: result.totalCost,
      tier: userTier,
      enrichmentCount: result.enrichments.length
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Research request error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}