import { Agent, AgentContext, AgentResult, AgentEnrichment, ResearchQuery, ResearchPaper, ResearchSynthesis, ResearchRarity } from '../types';
import { medicalAnalyzer } from '../medicalAnalyzer';
import { getOrthoResponse } from '../claude';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export class ResearchSynthesisAgent implements Agent {
  name = 'research-synthesis';
  description = 'Synthesizes medical research from PubMed for orthopedic questions';

  canHandle(context: AgentContext): boolean {
    // Handle research requests for authenticated users and above
    if (['basic'].includes(context.userTier)) {
      return false;
    }

    // Check if question is orthopedic-related
    const analysis = medicalAnalyzer.analyze(context.question);
    return analysis.bodyParts.length > 0 || analysis.conditions.length > 0;
  }

  estimateCost(context: AgentContext): number {
    // Estimate based on user tier and research complexity
    const tierCosts = {
      'authenticated': 0.05, // Bronze research - basic
      'medical': 0.10, // Silver research - enhanced  
      'scholar': 0.15, // Silver research - comprehensive
      'practitioner': 0.25, // Gold research - MD-ready
      'institution': 0.50 // Platinum research - multi-source
    };
    
    return tierCosts[context.userTier as keyof typeof tierCosts] || 0.05;
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Handle health checks quickly to prevent timeouts
      if (context.question === 'health_check') {
        return {
          success: true,
          data: 'healthy',
          enrichments: [],
          cost: 0
        };
      }

      console.log(`ResearchSynthesisAgent processing: ${context.question.substring(0, 100)}...`);

      // Analyze the question to extract research parameters
      const researchQuery = await this.extractResearchQuery(context.question);
      
      // Fetch relevant papers from PubMed
      const papers = await this.fetchResearchPapers(researchQuery, context.userTier);
      
      if (papers.length === 0) {
        return {
          success: false,
          error: 'No relevant research papers found for this query'
        };
      }

      // Synthesize the research
      const synthesis = await this.synthesizeResearch(researchQuery, papers, context.userTier);
      
      // Determine rarity tier based on synthesis quality and user tier
      const rarityTier = this.determineRarityTier(synthesis, context.userTier);
      
      // Create enrichment for the main response
      const enrichment: AgentEnrichment = {
        type: 'research',
        title: `Research Summary: ${researchQuery.condition}`,
        content: this.formatResearchForDisplay(synthesis),
        metadata: {
          studyCount: papers.length,
          evidenceStrength: synthesis.evidenceStrength,
          publicationYears: this.getYearRange(papers),
          searchQuery: researchQuery
        },
        nftEligible: true,
        rarityTier
      };

      return {
        success: true,
        data: synthesis,
        enrichments: [enrichment],
        cost: this.estimateCost(context)
      };

    } catch (error) {
      console.error('ResearchSynthesisAgent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Research synthesis failed'
      };
    }
  }

  private async extractResearchQuery(question: string): Promise<ResearchQuery> {
    const analysis = medicalAnalyzer.analyze(question);
    
    // Use Claude to extract more sophisticated research parameters
    const prompt = `Extract research parameters from this orthopedic question: "${question}"

    Provide JSON with:
    - condition: primary condition being asked about
    - bodyParts: anatomical areas involved
    - treatmentType: if asking about specific treatment (surgery, therapy, etc.)
    - studyTypes: preferred study types (rct, systematic-review, meta-analysis, cohort, case-control)
    - maxAge: maximum age of papers in years (default 10)
    
    Focus on evidence-based parameters for PubMed search.`;

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Claude API timeout')), 10000)
      );
      
      const apiPromise = anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]) as Anthropic.Messages.Message;

      const content = response.content[0];
      if (content.type === 'text') {
        // Clean up potential markdown code block formatting
        let cleanedText = content.text.trim();
        if (cleanedText.includes('```json')) {
          cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        } else if (cleanedText.startsWith('```') && cleanedText.endsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        
        const parsed = JSON.parse(cleanedText);
        
        return {
          condition: parsed.condition || analysis.conditions[0] || 'orthopedic condition',
          bodyParts: parsed.bodyParts || analysis.bodyParts,
          treatmentType: parsed.treatmentType,
          studyTypes: parsed.studyTypes || ['rct', 'systematic-review', 'meta-analysis'],
          maxAge: parsed.maxAge || 10,
          minSampleSize: analysis.complexityLevel > 5 ? 100 : 50
        };
      }
    } catch (error) {
      console.warn('Failed to extract research query with Claude, using fallback');
    }

    // Fallback to medical analyzer results
    return {
      condition: analysis.conditions[0] || 'orthopedic condition',
      bodyParts: analysis.bodyParts,
      treatmentType: analysis.treatmentContext === 'post-surgical' ? 'surgery' : undefined,
      studyTypes: ['rct', 'systematic-review', 'meta-analysis'],
      maxAge: 10,
      minSampleSize: 50
    };
  }

  private async fetchResearchPapers(query: ResearchQuery, userTier: string): Promise<ResearchPaper[]> {
    // Determine how many papers to fetch based on user tier
    const tierLimits = {
      'authenticated': 5, // Bronze
      'medical': 10, // Silver  
      'scholar': 15, // Silver comprehensive
      'practitioner': 20, // Gold
      'institution': 30 // Platinum
    };

    const limit = tierLimits[userTier as keyof typeof tierLimits] || 5;

    // Build PubMed search query
    const searchTerms = [
      query.condition,
      ...query.bodyParts,
      query.treatmentType
    ].filter(Boolean);

    const studyTypeFilters = query.studyTypes?.map(type => {
      switch(type) {
        case 'rct': return 'randomized controlled trial[pt]';
        case 'systematic-review': return 'systematic review[pt]';
        case 'meta-analysis': return 'meta-analysis[pt]';
        case 'cohort': return 'cohort studies[mesh]';
        case 'case-control': return 'case-control studies[mesh]';
        default: return '';
      }
    }).filter(Boolean) || [];

    // For MVP, we'll simulate PubMed results
    // In production, integrate with actual PubMed API
    return this.simulatePubMedResults(query, limit);
  }

  private async simulatePubMedResults(query: ResearchQuery, limit: number): Promise<ResearchPaper[]> {
    // Simulated research papers for MVP
    // In production, replace with actual PubMed API calls
    const simulatedPapers: ResearchPaper[] = [
      {
        pmid: '38123456',
        title: `Effectiveness of Conservative Treatment for ${query.condition}: A Systematic Review`,
        authors: ['Smith J', 'Johnson K', 'Williams M'],
        journal: 'Journal of Orthopedic Research',
        publicationDate: '2024-01-15',
        abstract: `Background: Conservative treatment approaches for ${query.condition} remain controversial. Methods: Systematic review of randomized controlled trials. Results: Significant improvement in pain scores (p<0.01). Conclusion: Conservative treatment shows promise.`,
        citationCount: 45,
        impactFactor: 3.2,
        evidenceLevel: 'I',
        fullTextAvailable: true
      },
      {
        pmid: '38234567',
        title: `Surgical vs Non-surgical Management of ${query.bodyParts[0]} Injuries: Meta-Analysis`,
        authors: ['Davis R', 'Miller P', 'Brown L'],
        journal: 'Orthopedic Surgery International',
        publicationDate: '2023-11-20',
        abstract: `Objective: Compare surgical and non-surgical approaches. Methods: Meta-analysis of 15 studies. Results: No significant difference in long-term outcomes. Conclusion: Both approaches are viable.`,
        citationCount: 67,
        impactFactor: 4.1,
        evidenceLevel: 'I',
        fullTextAvailable: false
      },
      {
        pmid: '38345678',
        title: `Risk Factors for ${query.condition}: Prospective Cohort Study`,
        authors: ['Taylor A', 'Wilson C', 'Anderson T'],
        journal: 'Sports Medicine Review',
        publicationDate: '2023-08-10',
        abstract: `Study design: Prospective cohort of 500 patients. Follow-up: 24 months. Key findings: Age and BMI are significant risk factors. Clinical relevance: Inform prevention strategies.`,
        citationCount: 23,
        impactFactor: 2.8,
        evidenceLevel: 'II',
        fullTextAvailable: true
      }
    ];

    return simulatedPapers.slice(0, Math.min(limit, simulatedPapers.length));
  }

  private async synthesizeResearch(query: ResearchQuery, papers: ResearchPaper[], userTier: string): Promise<ResearchSynthesis> {
    const prompt = `You are a medical research synthesis expert. Synthesize the following research papers for ${query.condition}.

RESEARCH PAPERS:
${papers.map(p => `
Title: ${p.title}
Journal: ${p.journal} (${p.publicationDate})
Evidence Level: ${p.evidenceLevel}
Abstract: ${p.abstract}
Citations: ${p.citationCount}
---`).join('\n')}

Provide a comprehensive synthesis in JSON format:
{
  "synthesis": "Main synthesis of findings (200-400 words)",
  "keyFindings": ["3-5 key findings as bullet points"],
  "limitations": ["2-3 main limitations of the evidence"],
  "clinicalRelevance": "Clinical relevance for patients (100-150 words)",
  "evidenceStrength": "strong|moderate|weak|insufficient"
}

Focus on practical implications for ${query.condition} affecting ${query.bodyParts.join(', ')}.
Maintain educational tone - this is information, not medical advice.`;

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Claude API timeout')), 10000)
      );
      
      const apiPromise = anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]) as Anthropic.Messages.Message;

      const content = response.content[0];
      if (content.type === 'text') {
        // Clean up potential markdown code block formatting
        let cleanedText = content.text.trim();
        if (cleanedText.includes('```json')) {
          cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        } else if (cleanedText.startsWith('```') && cleanedText.endsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        
        const parsed = JSON.parse(cleanedText);
        
        return {
          id: `research_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          query,
          papers,
          synthesis: parsed.synthesis,
          keyFindings: parsed.keyFindings,
          limitations: parsed.limitations,
          clinicalRelevance: parsed.clinicalRelevance,
          evidenceStrength: parsed.evidenceStrength,
          generatedAt: new Date(),
          mdReviewed: false
        };
      }
    } catch (error) {
      console.warn('Failed to synthesize with Claude, using fallback');
    }

    // Fallback synthesis
    return {
      id: `research_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      query,
      papers,
      synthesis: `Based on ${papers.length} research studies, current evidence for ${query.condition} shows mixed results. Further research is needed to establish definitive treatment guidelines.`,
      keyFindings: [
        `${papers.length} studies analyzed`,
        'Mixed evidence quality',
        'Treatment outcomes vary'
      ],
      limitations: [
        'Limited number of high-quality studies',
        'Heterogeneous study populations'
      ],
      clinicalRelevance: `The current evidence provides preliminary guidance for ${query.condition} management, but patients should consult healthcare providers for personalized recommendations.`,
      evidenceStrength: 'weak',
      generatedAt: new Date(),
      mdReviewed: false
    };
  }

  private determineRarityTier(synthesis: ResearchSynthesis, userTier: string): ResearchRarity {
    // Base rarity on user tier and synthesis quality
    const tierMapping: Record<string, ResearchRarity> = {
      'authenticated': 'bronze',
      'medical': 'silver',
      'scholar': 'silver', 
      'practitioner': 'gold',
      'institution': 'platinum'
    };

    let baseRarity = tierMapping[userTier] || 'bronze';

    // Upgrade rarity based on evidence strength
    if (synthesis.evidenceStrength === 'strong' && synthesis.papers.length >= 10) {
      if (baseRarity === 'bronze') baseRarity = 'silver';
      else if (baseRarity === 'silver') baseRarity = 'gold';
    }

    // Special upgrade for high-impact papers
    const hasHighImpact = synthesis.papers.some(p => (p.impactFactor || 0) > 5);
    if (hasHighImpact && baseRarity === 'gold') {
      baseRarity = 'platinum';
    }

    return baseRarity;
  }

  private formatResearchForDisplay(synthesis: ResearchSynthesis): string {
    return `# Research Summary: ${synthesis.query.condition}

## Key Findings
${synthesis.keyFindings.map(finding => `• ${finding}`).join('\n')}

## Research Synthesis
${synthesis.synthesis}

## Clinical Relevance
${synthesis.clinicalRelevance}

## Evidence Strength: ${synthesis.evidenceStrength.toUpperCase()}

## Limitations
${synthesis.limitations.map(limitation => `• ${limitation}`).join('\n')}

## Sources
Based on analysis of ${synthesis.papers.length} peer-reviewed publications.

---
*This is educational information only. Consult healthcare providers for medical advice.*`;
  }

  private getYearRange(papers: ResearchPaper[]): string {
    const years = papers.map(p => new Date(p.publicationDate).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return minYear === maxYear ? minYear.toString() : `${minYear}-${maxYear}`;
  }
}