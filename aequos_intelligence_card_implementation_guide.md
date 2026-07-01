# OrthoIQ Intelligence Card - Implementation Guide for Claude Code

## Overview
Transform the current prescription template into an **Intelligence Card** system that celebrates the multi-agent prediction market and creates retention through outcome validation.

## Core Concept
**OLD:** Prescription template with random rarity and artistic QR encryption
**NEW:** Intelligence Card showing agent token stakes, consensus metrics, and prediction tracking

## Implementation Phases

---

## PHASE 1: Intelligence Card Component

### Step 1.1: Create Card Data Mapper
**File:** `lib/intelligenceCardUtils.ts`

**Purpose:** Extract agent stake data from backend response and calculate card metadata

```typescript
interface AgentStakeData {
  specialist: string;
  agentName: string;
  tokenStake: number;
  participated: boolean;
  color: string; // For visual theming
}

interface IntelligenceCardData {
  caseId: string;
  timestamp: string;
  
  // Agent participation
  agentStakes: AgentStakeData[];
  totalStake: number;
  participatingCount: number;
  
  // Consensus metrics
  consensusPercentage: number; // from interAgentAgreement
  confidenceScore: number; // overall confidence
  
  // Primary prediction
  primaryPrediction: {
    text: string;
    agent: string;
    stake: number;
    timeline?: string;
  };
  
  // Verification status
  userFeedbackComplete: boolean;
  mdReviewComplete: boolean;
  outcomeValidated: boolean;
  
  // Provenance
  evidenceGrade?: string;
  mdVerified: boolean;
  
  // Rarity tier
  tier: 'standard' | 'complete' | 'verified' | 'exceptional';
}

export function mapConsultationToCardData(
  rawConsultationData: any,
  userFeedback: any,
  mdReview?: any
): IntelligenceCardData {
  // Extract agent stakes from prediction market data
  const agentStakes: AgentStakeData[] = [];
  
  // Map participating specialists
  rawConsultationData.participatingSpecialists.forEach((specialistType: string) => {
    const specialist = rawConsultationData.responses.find(
      (r: any) => r.specialist.toLowerCase().includes(specialistType.toLowerCase())
    );
    
    if (specialist) {
      agentStakes.push({
        specialist: specialistType,
        agentName: specialist.specialist,
        tokenStake: calculateStakeFromConfidence(specialist.confidence),
        participated: true,
        color: getAgentColor(specialistType)
      });
    }
  });
  
  // Calculate total stake
  const totalStake = agentStakes.reduce((sum, agent) => sum + agent.tokenStake, 0);
  
  // Extract consensus from synthesis
  const consensusPercentage = 
    rawConsultationData.synthesizedRecommendations?.confidenceFactors?.interAgentAgreement || 0;
  
  // Extract primary prediction (highest stake)
  const primaryAgent = agentStakes.sort((a, b) => b.tokenStake - a.tokenStake)[0];
  const primaryPrediction = extractPrimaryPrediction(
    rawConsultationData.responses.find(r => r.specialist === primaryAgent?.agentName)
  );
  
  // Determine rarity tier
  const tier = calculateRarityTier({
    participatingCount: agentStakes.length,
    consensusPercentage,
    mdVerified: !!mdReview,
    outcomeValidated: userFeedback?.validated || false
  });
  
  return {
    caseId: rawConsultationData.consultationId,
    timestamp: new Date().toISOString(),
    agentStakes,
    totalStake,
    participatingCount: agentStakes.length,
    consensusPercentage: consensusPercentage * 100, // Convert to percentage
    confidenceScore: rawConsultationData.synthesizedRecommendations?.confidenceFactors?.overallConfidence || 0,
    primaryPrediction: {
      text: primaryPrediction.text,
      agent: primaryAgent?.agentName || 'Triage',
      stake: primaryAgent?.tokenStake || 0,
      timeline: primaryPrediction.timeline
    },
    userFeedbackComplete: !!userFeedback,
    mdReviewComplete: !!mdReview,
    outcomeValidated: userFeedback?.validated || false,
    evidenceGrade: rawConsultationData.synthesizedRecommendations?.prescriptionData?.evidenceBase?.evidenceGrade,
    mdVerified: !!mdReview,
    tier
  };
}

function calculateStakeFromConfidence(confidence: number): number {
  // Matches backend exponential staking: base × confidence³
  const baseStake = 10;
  return baseStake * Math.pow(confidence, 3);
}

function getAgentColor(specialistType: string): string {
  const colorMap: Record<string, string> = {
    'triage': '#3b82f6',
    'painWhisperer': '#8b5cf6',
    'movementDetective': '#10b981',
    'strengthSage': '#f59e0b',
    'mindMender': '#ef4444'
  };
  return colorMap[specialistType] || '#64748b';
}

function extractPrimaryPrediction(response: any): { text: string; timeline?: string } {
  // Parse response to find primary prediction
  // This could look for keywords like "predict", "expect", "timeline"
  // For now, return a simplified version
  
  const responseText = response?.response || '';
  
  // Look for pain predictions (most common)
  const painMatch = responseText.match(/(\d{1,2})-(\d{1,2})% pain reduction/i);
  const timeMatch = responseText.match(/(\d{1,2}) weeks?/i);
  
  if (painMatch && timeMatch) {
    return {
      text: `${painMatch[1]}-${painMatch[2]}% pain reduction in ${timeMatch[1]} weeks`,
      timeline: `${timeMatch[1]} weeks`
    };
  }
  
  // Fallback to first sentence
  const firstSentence = responseText.split('.')[0];
  return {
    text: firstSentence.substring(0, 100) + '...',
    timeline: undefined
  };
}

function calculateRarityTier(params: {
  participatingCount: number;
  consensusPercentage: number;
  mdVerified: boolean;
  outcomeValidated: boolean;
}): 'standard' | 'complete' | 'verified' | 'exceptional' {
  const { participatingCount, consensusPercentage, mdVerified, outcomeValidated } = params;
  
  // Exceptional: All 5 agents + 90%+ consensus + MD verified + outcome validated
  if (participatingCount === 5 && consensusPercentage >= 90 && mdVerified && outcomeValidated) {
    return 'exceptional';
  }
  
  // Verified: All 5 agents + 90%+ consensus + MD verified
  if (participatingCount === 5 && consensusPercentage >= 90 && mdVerified) {
    return 'verified';
  }
  
  // Complete: 4-5 agents + 80%+ consensus
  if (participatingCount >= 4 && consensusPercentage >= 80) {
    return 'complete';
  }
  
  // Standard: Everything else
  return 'standard';
}
```

### Step 1.2: Create SVG Intelligence Card Component
**File:** `components/IntelligenceCard.tsx`

**Key Features:**
- Dynamic agent stake display with token amounts
- Consensus meter with animated fill
- Generative border patterns based on specialist participation
- Verification status badges
- QR code linking to tracking page
- Tier-based visual styling

**Component Structure:**
```tsx
import React from 'react';
import { IntelligenceCardData } from '@/lib/intelligenceCardUtils';

interface IntelligenceCardProps {
  data: IntelligenceCardData;
  size?: 'small' | 'medium' | 'large';
}

export function IntelligenceCard({ data, size = 'medium' }: IntelligenceCardProps) {
  return (
    <svg 
      viewBox="0 0 450 600" 
      className={`intelligence-card tier-${data.tier}`}
    >
      {/* Generative border patterns layer */}
      <GenerativeBorder 
        agents={data.agentStakes} 
        consensus={data.consensusPercentage}
        tier={data.tier}
      />
      
      {/* Main card content */}
      <g className="card-content">
        <CardHeader caseId={data.caseId} tier={data.tier} />
        
        <AgentPanel 
          agents={data.agentStakes}
          totalStake={data.totalStake}
          consensus={data.consensusPercentage}
        />
        
        <PrimaryPrediction prediction={data.primaryPrediction} />
        
        <VerificationStatus 
          userFeedback={data.userFeedbackComplete}
          mdReview={data.mdReviewComplete}
          validated={data.outcomeValidated}
        />
        
        <QRSection caseId={data.caseId} />
        
        <CardFooter 
          timestamp={data.timestamp}
          evidenceGrade={data.evidenceGrade}
          mdVerified={data.mdVerified}
        />
      </g>
    </svg>
  );
}
```

**Implementation Notes:**
- Use SVG for perfect scaling and NFT compatibility
- Animate consensus meter on mount
- Generate unique border patterns per card based on agent participation
- Include proper accessibility labels

---

## PHASE 2: Tracking Page & Outcome Validation

### Step 2.1: Create Tracking Route
**File:** `app/track/[caseId]/page.tsx`

**Purpose:** Allow users to view predictions, report outcomes, and validate agent accuracy

**Features:**
- Display all agent predictions with timelines
- Show current validation status (user feedback ✓, MD review pending, etc.)
- Input forms for outcome validation at milestones
- Community comparison stats
- Agent performance on this specific case

**Data Flow:**
```
QR scan → /track/[caseId] → 
  - Verify user FID matches case owner
  - Load consultation data + prediction market data
  - Show predictions with milestone timelines
  - Enable outcome validation forms at appropriate times
  - Call /predictions/resolve/follow-up endpoint with results
```

### Step 2.2: Outcome Validation Forms
**Component:** `components/OutcomeValidationForm.tsx`

**Validation Types:**
1. **Pain Level Check** (at 2 weeks, 4 weeks)
   - Current pain level (1-10)
   - Percentage improvement
   - Validates Pain Whisperer predictions

2. **Functional Status** (at 4 weeks, 8 weeks)
   - Return to activity status
   - Functional limitations
   - Validates Strength Sage predictions

3. **Movement Assessment** (at 2 weeks, 6 weeks)
   - Range of motion
   - Movement quality
   - Validates Movement Detective predictions

**API Integration:**
```typescript
async function submitOutcomeValidation(caseId: string, outcomeData: any) {
  const response = await fetch('/api/predictions/resolve/follow-up', {
    method: 'POST',
    body: JSON.stringify({
      consultationId: caseId,
      followUpData: {
        painLevel: outcomeData.painLevel,
        functionalStatus: outcomeData.functionalStatus,
        movementQuality: outcomeData.movementQuality,
        timestamp: new Date().toISOString()
      }
    })
  });
  
  // Backend calculates prediction accuracy and distributes tokens
  const result = await response.json();
  
  // Update card tier if outcome validated
  if (result.validated) {
    // Trigger card upgrade to higher tier
    updateIntelligenceCardTier(caseId, 'exceptional');
  }
}
```

### Step 2.3: Reminder System
**Implementation:** Use Farcaster/Base app notification system

**Milestone Reminders:**
- 2 weeks: "Check your recovery progress for case #OI-2847"
- 4 weeks: "Validate your functional restoration predictions"
- 8 weeks: "Final outcome validation to unlock premium features"

**Notification Payload:**
```json
{
  "type": "prediction_milestone",
  "caseId": "OI-2847",
  "message": "Time to validate Pain Whisperer's prediction! Report your current pain level.",
  "deepLink": "orthoiq://track/OI-2847",
  "timestamp": "2025-01-03T..."
}
```

---

## PHASE 3: Admin Dashboard Integration

### Step 3.1: Update Admin Dashboard
**File:** `app/admin/dashboard/page.tsx`

**New Metrics to Display:**

**1. Prediction Market Statistics**
- Total predictions made
- Average agent accuracy
- Token distribution across agents
- Consensus trends over time

**2. Agent Performance Leaderboard**
- Pain Whisperer: 91% accuracy, 256 tokens earned
- Strength Sage: 94% accuracy, 287 tokens earned
- Movement Detective: 88% accuracy, 198 tokens earned
- etc.

**3. Intelligence Card Distribution**
- Standard tier: 60%
- Complete tier: 25%
- Verified tier: 10%
- Exceptional tier: 5%

**4. User Engagement Metrics**
- Outcome validation rate (target: >40%)
- Average time to first validation
- Repeat consultation rate
- Premium feature unlock rate

**API Endpoint:**
```typescript
// Already implemented in backend: GET /predictions/market/statistics
const stats = await fetch('/api/predictions/market/statistics').then(r => r.json());

// Display in dashboard
{
  totalPredictions: 1247,
  averageAccuracy: 0.89,
  topPerformers: [
    { agent: 'Strength Sage', accuracy: 0.94, tokensEarned: 287 },
    { agent: 'Pain Whisperer', accuracy: 0.91, tokensEarned: 256 }
  ],
  consensusTrends: [
    { week: '2025-W01', avgConsensus: 0.87 },
    { week: '2025-W02', avgConsensus: 0.89 }
  ]
}
```

### Step 3.2: MD Review Integration
**Purpose:** Allow MDs to review consultations and validate agent predictions

**Features:**
- Queue of pending consultations for review
- Display agent predictions alongside user question
- Approve/reject recommendations
- Add feedback notes
- Automatically calls `/predictions/resolve/md-review` endpoint

**Review Form:**
```tsx
interface MDReviewForm {
  consultationId: string;
  approved: boolean;
  clinicalAccuracy: number; // 1-5 scale
  feedbackNotes: string;
  timestamp: string;
}

async function submitMDReview(review: MDReviewForm) {
  await fetch('/api/predictions/resolve/md-review', {
    method: 'POST',
    body: JSON.stringify({
      consultationId: review.consultationId,
      mdReviewData: {
        approved: review.approved,
        clinicalAccuracy: review.clinicalAccuracy,
        feedback: review.feedbackNotes,
        timestamp: review.timestamp
      }
    })
  });
  
  // Update Intelligence Card tier if MD verified
  if (review.approved && review.clinicalAccuracy >= 4) {
    updateCardTier(review.consultationId, 'verified');
  }
}
```

---

## PHASE 4: Replace Current Prescription System

### Step 4.1: Update ResponseCard Component
**File:** `components/ResponseCard.tsx`

**Changes:**
1. Replace `<PrescriptionGenerator>` call with `<IntelligenceCard>` call
2. Update modal to show Intelligence Card instead of prescription
3. Keep feedback gate but trigger card unlock after feedback
4. Update sharing/export to use new card format

**Before:**
```tsx
<PrescriptionModal
  prescriptionData={{
    userQuestion,
    claudeResponse,
    confidence,
    ...
  }}
/>
```

**After:**
```tsx
<IntelligenceCardModal
  cardData={mapConsultationToCardData(
    rawConsultationData,
    userFeedback,
    mdReview
  )}
/>
```

### Step 4.2: Update Export Utilities
**File:** `lib/exportUtils.ts`

**Changes:**
1. Export Intelligence Card as PNG/SVG
2. Generate NFT metadata with tier info
3. Include QR code in export
4. Social media format optimizations

**NFT Metadata Schema:**
```json
{
  "name": "OrthoIQ Intelligence Card #OI-2847",
  "description": "5-specialist consultation with 91% consensus, MD verified, Grade A evidence",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Tier", "value": "Verified" },
    { "trait_type": "Specialists", "value": 5 },
    { "trait_type": "Consensus", "value": 91 },
    { "trait_type": "Total Stake", "value": 47.7 },
    { "trait_type": "MD Verified", "value": true },
    { "trait_type": "Evidence Grade", "value": "A" },
    { "trait_type": "Outcome Validated", "value": false }
  ],
  "properties": {
    "caseId": "OI-2847",
    "timestamp": "2025-12-20T...",
    "chain": "Base",
    "trackingUrl": "https://orthoiq.app/track/OI-2847"
  }
}
```

---

## PHASE 5: Testing & Validation

### Step 5.1: Test Cases

**Test 1: Standard Tier Card**
- Input: 3 specialists, 76% consensus, no MD review
- Expected: Blue theme, basic tracking features
- Token stakes: ~5-8 tokens per agent

**Test 2: Verified Tier Card**
- Input: 5 specialists, 91% consensus, MD approved
- Expected: Gold theme with holographic effects
- All specialist patterns visible in border

**Test 3: Exceptional Tier Card**
- Input: 5 specialists, 94% consensus, MD approved, outcome validated
- Expected: Purple/rainbow holographic, premium features unlocked
- Highest token stakes (15+ per agent)

**Test 4: Outcome Validation Flow**
- User receives card → Scans QR → Views predictions
- Receives reminder at 2 weeks → Reports pain level
- System validates Pain Whisperer prediction → Distributes tokens
- Card updates with validation status

### Step 5.2: Performance Metrics

**Target Metrics:**
- Card generation time: <200ms
- SVG file size: <150KB
- PNG export size: <500KB
- Tracking page load: <1s
- Outcome validation submission: <300ms

---

## Implementation Priority

**Week 1:**
1. Create `intelligenceCardUtils.ts` data mapper ✓
2. Build `IntelligenceCard.tsx` SVG component ✓
3. Replace prescription in ResponseCard ✓
4. Test with existing consultation data ✓

**Week 2:**
1. Build `/track/[caseId]` tracking page ✓
2. Create outcome validation forms ✓
3. Integrate reminder system ✓
4. Test full validation flow ✓

**Week 3:**
1. Update admin dashboard with agent stats ✓
2. Build MD review interface ✓
3. Implement card tier progression ✓
4. Export/sharing optimizations ✓

**Week 4:**
1. Polish UI/UX ✓
2. Performance optimizations ✓
3. User testing & feedback ✓
4. Production deployment ✓

---

## Key Decisions for Claude Code

### 1. Data Source Priority
**Question:** Where should we pull token stake data from?

**Recommendation:** Use prediction market data from backend if available, otherwise calculate stakes from confidence levels using the formula: `stake = 10 × confidence³`

### 2. QR Code Generation
**Question:** Generate QR dynamically or use static placeholder?

**Recommendation:** Generate real QR codes using `qrcode` library linking to `/track/[caseId]` route. Include FID verification on tracking page.

### 3. Border Pattern Complexity
**Question:** How complex should generative patterns be?

**Recommendation:** Keep it simple with 5 distinct SVG patterns per specialist. Higher stakes = more pattern repetition/prominence. Consensus affects blending smoothness.

### 4. Tier Progression Timing
**Question:** When does card tier update?

**Recommendation:** 
- Standard → Complete: When 4+ specialists participate
- Complete → Verified: When MD review completes
- Verified → Exceptional: When outcome validation completes

Update happens via webhook/polling after backend resolves predictions.

### 5. Mobile Optimization
**Question:** How to handle card on mobile?

**Recommendation:** Use responsive SVG that scales to container. On mobile, card takes full width. Consider separate "compact" view for list displays.

---

## Success Criteria

✅ **User Retention:** 40%+ outcome validation rate
✅ **Engagement:** Average 2.5+ visits per case (initial + follow-ups)
✅ **Differentiation:** 5/5 specialists + high consensus = <10% of cards (true achievement)
✅ **Network Effects:** Community comparison metrics drive repeat consultations
✅ **Agent Learning:** Validated outcomes improve prediction accuracy over time
✅ **Premium Conversion:** Exceptional tier users have 3x higher premium feature adoption

---

## Claude Code Prompts

### Prompt 1: Create Data Mapper
```
Create lib/intelligenceCardUtils.ts that maps rawConsultationData from the OrthoIQ-agents backend into IntelligenceCardData format. 

Key requirements:
- Extract agent stakes from participating specialists
- Calculate token stakes using exponential formula: 10 × confidence³
- Determine consensus from confidenceFactors.interAgentAgreement
- Extract primary prediction (highest stake agent)
- Calculate rarity tier based on specialist count, consensus %, MD verification
- Return all data needed to render the Intelligence Card

Reference the backend response structure in OrthoIQ-Agents_Request_Pipeline document.
```

### Prompt 2: Build SVG Card Component
```
Create components/IntelligenceCard.tsx as an SVG component that renders the intelligence card.

Required elements:
- Generative border patterns (different pattern per specialist type)
- Agent panel showing each specialist with token stake
- Consensus meter with animated fill bar
- Primary prediction highlight
- Verification status badges (user feedback, MD review, validation)
- QR code placeholder (we'll generate real QR in next step)
- Footer with provenance (case ID, timestamp, Base chain, evidence grade)

Use tier prop to apply different visual treatments:
- standard: blue theme
- complete: teal/gold theme  
- verified: gold with holographic effects
- exceptional: purple/rainbow holographic with animation

Reference the mockup HTML for styling and layout.
```

### Prompt 3: Create Tracking Page
```
Create app/track/[caseId]/page.tsx route for outcome validation.

Features needed:
- Verify user FID matches case owner
- Load consultation + prediction market data
- Display all agent predictions with timelines
- Show milestone validation forms (pain at 2 weeks, function at 4 weeks)
- Submit outcomes to /predictions/resolve/follow-up endpoint
- Display community comparison stats
- Show agent performance on this case

Reference INTER_AGENT_TOKEN_ECONOMY_SUMMARY for prediction resolution cascade.
```

### Prompt 4: Update ResponseCard
```
Update components/ResponseCard.tsx to use the new IntelligenceCard instead of PrescriptionGenerator.

Changes:
1. Import intelligenceCardUtils and IntelligenceCard component
2. After user submits feedback, map rawConsultationData to IntelligenceCardData
3. Pass cardData to IntelligenceCard component
4. Update export functionality to export card as PNG/SVG
5. Generate NFT metadata with tier and attribute information

Keep the feedback gate - card only unlocks after user provides feedback.
```

---

## Final Notes

This system transforms OrthoIQ from "AI consultation with pretty receipt" to "prediction market with verifiable outcomes and progressive utility." The Intelligence Card becomes:

1. **Proof of Quality:** Visible agent stakes and consensus show consultation quality
2. **Status Symbol:** Achievement-based rarity creates aspirational tiers
3. **Learning Mechanism:** Outcome validation improves agent accuracy
4. **Retention Driver:** QR tracking and reminders bring users back
5. **Network Effect:** Community comparisons encourage sharing and repeat use
6. **Premium Funnel:** Exceptional tier unlocks Research Agent + Wearable integration

The key insight: **Make the agent prediction market the hero, not hide it.**
