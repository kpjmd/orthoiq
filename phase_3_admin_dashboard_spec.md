# Phase 3: Admin Dashboard - Complete Specification

## Overview
Transform the admin dashboard to showcase the orthoiq-agents prediction market system with real-time performance metrics, agent analytics, and user engagement tracking.

---

## Dashboard Architecture

### Core Sections
1. **System Overview** - High-level health metrics
2. **Prediction Market Analytics** - Agent performance and token economics
3. **Intelligence Card Distribution** - Tier breakdowns and quality metrics
4. **User Engagement** - Retention, validation rates, return visits
5. **MD Review Queue** - Pending consultations requiring physician review
6. **Agent Performance Leaderboard** - Individual agent statistics
7. **Recent Activity Feed** - Live consultation stream

---

## Section 1: System Overview Dashboard

### Key Metrics (Top Cards)

```tsx
interface SystemMetrics {
  // Consultation Volume
  totalConsultations: number;
  consultationsToday: number;
  consultationsThisWeek: number;
  weekOverWeekGrowth: number; // percentage
  
  // Agent Activity
  averageAgentsPerConsultation: number;
  totalAgentInvocations: number;
  averageConsensus: number; // percentage
  
  // Quality Indicators
  averageMDApprovalRate: number;
  averageUserSatisfaction: number; // 1-5 scale
  outcomeValidationRate: number; // percentage who validate
  
  // Token Economics
  totalTokensIssued: number;
  tokensInCirculation: number;
  averageStakePerConsultation: number;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM OVERVIEW                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 1,247       │  │ 4.2/5.0     │  │ 89%         │         │
│  │ Total Cases │  │ Avg Agents  │  │ Consensus   │         │
│  │ +12% WoW    │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 91%         │  │ 4.3/5.0     │  │ 42%         │         │
│  │ MD Approval │  │ User Satis. │  │ Validated   │         │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  CONSULTATION VOLUME (Last 30 Days)                         │
│  ┌─────────────────────────────────────────────┐           │
│  │     [Line Chart: Daily Consultations]       │           │
│  │     Shows trend + 7-day moving average      │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoint:**
```typescript
// GET /api/admin/metrics/overview
{
  totalConsultations: 1247,
  consultationsToday: 18,
  consultationsThisWeek: 94,
  weekOverWeekGrowth: 12.3,
  averageAgentsPerConsultation: 4.2,
  totalAgentInvocations: 5238,
  averageConsensus: 0.89,
  averageMDApprovalRate: 0.91,
  averageUserSatisfaction: 4.3,
  outcomeValidationRate: 0.42,
  totalTokensIssued: 6247,
  tokensInCirculation: 6247,
  averageStakePerConsultation: 38.4
}
```

---

## Section 2: Prediction Market Analytics

### Agent Performance Metrics

```tsx
interface AgentPerformance {
  agentId: string;
  agentName: string;
  
  // Prediction Accuracy
  totalPredictions: number;
  accuratePredictions: number;
  accuracyRate: number; // percentage
  
  // Token Economics
  tokensEarned: number;
  tokensStaked: number;
  averageStakePerPrediction: number;
  netTokenGain: number; // earned - lost
  
  // Confidence Calibration
  averageConfidence: number; // 0-1
  calibrationScore: number; // how well confidence matches accuracy
  
  // Specialization
  topPredictionDimensions: string[]; // pain, mobility, function, etc.
  participationRate: number; // % of consultations they join
  
  // Recent Performance
  last7DaysAccuracy: number;
  last30DaysAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  PREDICTION MARKET ANALYTICS                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AGENT LEADERBOARD (Sorted by Accuracy)                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ #1 Strength Sage                                      │ │
│  │    94.2% accuracy • 287 tokens earned • ↑ improving   │ │
│  │    [████████████████████████░░] 94%                   │ │
│  │    147 predictions • Avg stake: 11.3 tokens           │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ #2 Pain Whisperer                                     │ │
│  │    91.8% accuracy • 256 tokens earned • → stable      │ │
│  │    [████████████████████░░░░] 92%                     │ │
│  │    189 predictions • Avg stake: 9.7 tokens            │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ #3 Movement Detective                                 │ │
│  │    88.3% accuracy • 198 tokens earned • ↑ improving   │ │
│  │    [██████████████████░░░░░░] 88%                     │ │
│  │    132 predictions • Avg stake: 8.4 tokens            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  TOKEN DISTRIBUTION                                         │
│  ┌─────────────────────────────────────────────┐           │
│  │  [Pie Chart: Token Balance by Agent]        │           │
│  │  Strength: 287 (31%)                        │           │
│  │  Pain: 256 (28%)                            │           │
│  │  Movement: 198 (21%)                        │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ACCURACY TRENDS (Last 30 Days)                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  [Multi-line Chart: Each agent's accuracy   │           │
│  │   over time, shows which agents improving]  │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoint:**
```typescript
// GET /api/admin/prediction-market/performance
// Proxies to orthoiq-agents backend: GET /predictions/market/statistics

{
  totalPredictions: 1247,
  averageAccuracy: 0.89,
  totalTokensDistributed: 6247,
  topPerformers: [
    {
      agentId: "strength_sage",
      agentName: "Strength Sage",
      accuracyRate: 0.942,
      tokensEarned: 287,
      totalPredictions: 147,
      last7DaysAccuracy: 0.956,
      trend: "improving"
    },
    // ... other agents
  ],
  predictionDimensions: {
    pain: { totalPredictions: 489, accuracy: 0.91 },
    mobility: { totalPredictions: 312, accuracy: 0.87 },
    function: { totalPredictions: 278, accuracy: 0.93 }
  }
}
```

---

## Section 3: Intelligence Card Distribution

### Tier Breakdown Metrics

```tsx
interface CardDistribution {
  // Overall Distribution
  total: number;
  byTier: {
    standard: { count: number; percentage: number };
    complete: { count: number; percentage: number };
    verified: { count: number; percentage: number };
    exceptional: { count: number; percentage: number };
  };
  
  // Quality Indicators
  averageSpecialistsPerCard: number;
  averageConsensusPerTier: {
    standard: number;
    complete: number;
    verified: number;
    exceptional: number;
  };
  
  // Progression Metrics
  cardsAwaitingMDReview: number; // could upgrade to verified
  cardsAwaitingValidation: number; // could upgrade to exceptional
  recentUpgrades: number; // cards upgraded in last 7 days
  
  // Sharing & Engagement
  publicCards: number;
  privateCards: number;
  averageSharesPerCard: number;
  qrScansThisWeek: number;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  INTELLIGENCE CARD DISTRIBUTION                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TIER BREAKDOWN (Total: 1,247 cards)                        │
│  ┌─────────────────────────────────────────────┐           │
│  │  [Donut Chart]                              │           │
│  │                                             │           │
│  │  ● Standard (748)    60%  ████████████████  │           │
│  │  ● Complete (312)    25%  ███████           │           │
│  │  │  Verified (125)   10%  ███               │           │
│  │  ● Exceptional (62)   5%  █                 │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  QUALITY METRICS BY TIER                                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Tier         | Avg Specialists | Avg Consensus      │ │
│  │──────────────|─────────────────|───────────────────│ │
│  │ Standard     | 2.8             | 76%               │ │
│  │ Complete     | 4.4             | 84%               │ │
│  │ Verified     | 5.0             | 92%               │ │
│  │ Exceptional  | 5.0             | 94%  (validated)  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  UPGRADE PIPELINE                                           │
│  ┌─────────────────────────────────────────────┐           │
│  │  Complete → Verified (awaiting MD):     47  │           │
│  │  Verified → Exceptional (validation):   23  │           │
│  │  Recent upgrades (7 days):              12  │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  PRIVACY & SHARING                                          │
│  Public: 892 (71%) | Private: 355 (29%)                    │
│  QR scans this week: 234 | Avg shares/card: 1.8            │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoint:**
```typescript
// GET /api/admin/cards/distribution

{
  total: 1247,
  byTier: {
    standard: { count: 748, percentage: 60.0 },
    complete: { count: 312, percentage: 25.0 },
    verified: { count: 125, percentage: 10.0 },
    exceptional: { count: 62, percentage: 5.0 }
  },
  averageSpecialistsPerCard: 4.2,
  averageConsensusPerTier: {
    standard: 0.76,
    complete: 0.84,
    verified: 0.92,
    exceptional: 0.94
  },
  cardsAwaitingMDReview: 47,
  cardsAwaitingValidation: 23,
  recentUpgrades: 12,
  publicCards: 892,
  privateCards: 355,
  qrScansThisWeek: 234
}
```

---

## Section 4: User Engagement Metrics

### Retention & Validation Tracking

```tsx
interface EngagementMetrics {
  // Outcome Validation
  totalConsultations: number;
  week2Validations: number;
  week4Validations: number;
  week8Validations: number;
  overallValidationRate: number; // percentage
  
  // Return Visits
  averageVisitsPerCase: number;
  casesWithMultipleVisits: number;
  percentageReturning: number;
  
  // Milestone Completion
  week2CompletionRate: number;
  week4CompletionRate: number;
  week8CompletionRate: number;
  
  // User Journey
  averageDaysToFirstValidation: number;
  averageDaysToFullValidation: number;
  dropoffAtMilestone: {
    week2: number; // percentage who drop off
    week4: number;
    week8: number;
  };
  
  // Premium Unlocks
  usersWithResearchAgentAccess: number;
  usersWithWearableIntegration: number;
  premiumConversionRate: number;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  USER ENGAGEMENT METRICS                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VALIDATION FUNNEL                                          │
│  ┌─────────────────────────────────────────────┐           │
│  │  Initial Consultation:  1,247  ████████████ │           │
│  │  Week 2 Validation:       524  █████        │ 42%       │
│  │  Week 4 Validation:       298  ███          │ 24%       │
│  │  Week 8 Validation:       156  █            │ 13%       │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  RETURN VISIT PATTERNS                                      │
│  ┌─────────────────────────────────────────────┐           │
│  │  Avg visits per case: 2.8                   │           │
│  │  Cases with 2+ visits: 67%                  │           │
│  │  Cases with 3+ visits: 42%                  │           │
│  │  [Bar Chart: Visit frequency distribution]  │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  MILESTONE COMPLETION RATES                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Week 2:  ██████████████████░░░░░░░░░░  42%          │ │
│  │  Week 4:  ████████████░░░░░░░░░░░░░░░░  24%          │ │
│  │  Week 8:  ██████░░░░░░░░░░░░░░░░░░░░░░  13%          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  PREMIUM FEATURE ADOPTION                                   │
│  Research Agent Access: 125 users (10%)                     │
│  Wearable Integration: 62 users (5%)                        │
│  Premium Conversion Rate: 8.2%                              │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoint:**
```typescript
// GET /api/admin/engagement/metrics

{
  totalConsultations: 1247,
  week2Validations: 524,
  week4Validations: 298,
  week8Validations: 156,
  overallValidationRate: 0.42,
  averageVisitsPerCase: 2.8,
  casesWithMultipleVisits: 835,
  percentageReturning: 0.67,
  week2CompletionRate: 0.42,
  week4CompletionRate: 0.24,
  week8CompletionRate: 0.13,
  averageDaysToFirstValidation: 14.2,
  averageDaysToFullValidation: 56.8,
  dropoffAtMilestone: {
    week2: 0.58,
    week4: 0.43,
    week8: 0.48
  },
  usersWithResearchAgentAccess: 125,
  usersWithWearableIntegration: 62,
  premiumConversionRate: 0.082
}
```

---

## Section 5: MD Review Queue

### Pending Review Interface

```tsx
interface PendingReview {
  consultationId: string;
  caseId: string;
  submittedAt: string;
  userQuestion: string;
  
  // Agent Analysis Summary
  participatingAgents: number;
  consensus: number;
  primaryPrediction: string;
  urgencyLevel: 'routine' | 'semi-urgent' | 'urgent';
  
  // Red Flags (if any)
  redFlags: string[];
  clinicalConcerns: string[];
  
  // Current Tier
  currentTier: 'standard' | 'complete';
  potentialTier: 'verified' | 'exceptional'; // if approved
  
  // User Feedback
  userSatisfaction: number;
  userFeedbackNotes?: string;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  MD REVIEW QUEUE (47 pending)                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FILTERS: [ All | Urgent | High Consensus | New ]          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Case #OI-2847 • 2 days ago • Complete → Verified     │ │
│  │                                                       │ │
│  │ User: "Knee pain when running, 3 months"             │ │
│  │                                                       │ │
│  │ ● 5/5 Specialists • 91% Consensus • Semi-urgent      │ │
│  │ Primary Prediction: 70-80% pain reduction in 2 weeks │ │
│  │ User Satisfaction: 4.5/5.0                           │ │
│  │                                                       │ │
│  │ [View Full Consultation] [Approve ✓] [Needs Review] │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ Case #OI-2891 • 5 hours ago • Complete → Verified   │ │
│  │ ...                                                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  REVIEW STATISTICS                                          │
│  Pending: 47 | Approved Today: 12 | Avg Review Time: 4.2h  │
└─────────────────────────────────────────────────────────────┘
```

**Review Action Modal:**
```tsx
interface MDReviewAction {
  consultationId: string;
  approved: boolean;
  clinicalAccuracy: number; // 1-5
  feedbackNotes: string;
  recommendationChanges?: string;
}

// POST /api/admin/md-review
// Calls backend: POST /predictions/resolve/md-review
```

---

## Section 6: Agent Detail View

**Click any agent in leaderboard → Full detail page**

```tsx
interface AgentDetailMetrics {
  // Identity
  agentId: string;
  agentName: string;
  specialization: string;
  description: string;
  
  // Performance History
  accuracyOverTime: Array<{ date: string; accuracy: number }>;
  tokenBalanceHistory: Array<{ date: string; balance: number }>;
  
  // Prediction Breakdown
  byDimension: {
    pain: { predictions: number; accuracy: number };
    mobility: { predictions: number; accuracy: number };
    function: { predictions: number; accuracy: number };
  };
  
  // Confidence Calibration
  confidenceBuckets: Array<{
    range: string; // "70-80%"
    predictions: number;
    actualAccuracy: number;
    calibrationGap: number; // difference between confidence and accuracy
  }>;
  
  // Recent Consultations
  recentCases: Array<{
    caseId: string;
    prediction: string;
    stake: number;
    outcome?: 'accurate' | 'inaccurate' | 'pending';
  }>;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  AGENT DETAIL: Strength Sage                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OVERVIEW                                                   │
│  Current Balance: 287 tokens | Accuracy: 94.2% | Rank: #1  │
│  Specialization: Functional restoration & rehabilitation    │
│                                                             │
│  ACCURACY TREND (Last 90 Days)                              │
│  ┌─────────────────────────────────────────────┐           │
│  │  [Line Chart: Daily accuracy with trend]    │           │
│  │  Shows: 88% → 91% → 94% (improving)        │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  TOKEN BALANCE HISTORY                                      │
│  ┌─────────────────────────────────────────────┐           │
│  │  [Line Chart: Token accumulation over time] │           │
│  │  Shows: Earning rate increasing             │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  PREDICTION SPECIALIZATION                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Functional Restoration:  96.2% accuracy (89 cases)  │ │
│  │  Return to Activity:      93.1% accuracy (67 cases)  │ │
│  │  Strength Deficits:       91.8% accuracy (54 cases)  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  CONFIDENCE CALIBRATION                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  70-80% confident → 76% accurate (well calibrated)   │ │
│  │  80-90% confident → 88% accurate (slightly under)    │ │
│  │  90-100% confident → 96% accurate (excellent!)       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  RECENT CONSULTATIONS (Last 10)                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  #OI-2847: Return to running (11.3 tokens) • ✓       │ │
│  │  #OI-2834: Functional restoration (9.8 tokens) • ✓   │ │
│  │  #OI-2812: Strength protocol (13.1 tokens) • Pending │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 7: Recent Activity Feed

**Real-time consultation stream**

```tsx
interface ActivityItem {
  timestamp: string;
  type: 'consultation' | 'validation' | 'md_review' | 'tier_upgrade';
  caseId: string;
  description: string;
  metadata?: any;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  RECENT ACTIVITY (Live)                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ● 2 minutes ago                                            │
│    New consultation #OI-2903 • 5 specialists • 89% consensus│
│                                                             │
│  ● 8 minutes ago                                            │
│    Week 2 validation completed for #OI-2847 • Pain reduced  │
│                                                             │
│  ● 14 minutes ago                                           │
│    MD approved #OI-2891 → Upgraded to Verified tier        │
│                                                             │
│  ● 23 minutes ago                                           │
│    Exceptional tier achieved #OI-2834 • Outcome validated   │
│                                                             │
│  [ Load More ]                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan for Claude Code

### Step 1: Backend API Routes

**File:** `app/api/admin/metrics/overview/route.ts`

```typescript
// GET /api/admin/metrics/overview
// Aggregates data from database + orthoiq-agents backend

export async function GET() {
  // Query local database
  const consultations = await db.query(
    'SELECT COUNT(*) as total FROM consultations WHERE created_at >= NOW() - INTERVAL 30 DAY'
  );
  
  // Query orthoiq-agents backend
  const agentStats = await fetch('http://localhost:3000/tokens/statistics')
    .then(r => r.json());
  
  return NextResponse.json({
    totalConsultations: consultations.total,
    averageAgentsPerConsultation: agentStats.averageAgentsPerCase,
    // ... combine data from both sources
  });
}
```

**File:** `app/api/admin/prediction-market/performance/route.ts`

```typescript
// GET /api/admin/prediction-market/performance
// Proxies to orthoiq-agents: GET /predictions/market/statistics

export async function GET() {
  const stats = await fetch('http://localhost:3000/predictions/market/statistics')
    .then(r => r.json());
  
  return NextResponse.json(stats);
}
```

**File:** `app/api/admin/cards/distribution/route.ts`

```typescript
// GET /api/admin/cards/distribution
// Calculates tier distribution from consultations table

export async function GET() {
  const consultations = await db.query(`
    SELECT 
      tier,
      COUNT(*) as count,
      AVG(consensus_percentage) as avg_consensus,
      AVG(participating_specialists) as avg_specialists
    FROM consultations
    GROUP BY tier
  `);
  
  // Calculate percentages
  const total = consultations.reduce((sum, t) => sum + t.count, 0);
  
  return NextResponse.json({
    total,
    byTier: consultations.map(t => ({
      tier: t.tier,
      count: t.count,
      percentage: (t.count / total) * 100
    })),
    // ...
  });
}
```

**File:** `app/api/admin/engagement/metrics/route.ts`

```typescript
// GET /api/admin/engagement/metrics
// Calculates validation rates and return visits

export async function GET() {
  const totalConsultations = await db.query('SELECT COUNT(*) FROM consultations');
  
  const validations = await db.query(`
    SELECT 
      milestone_week,
      COUNT(*) as count
    FROM milestone_feedback
    GROUP BY milestone_week
  `);
  
  const returnVisits = await db.query(`
    SELECT 
      case_id,
      COUNT(DISTINCT DATE(created_at)) as visit_days
    FROM tracking_page_views
    GROUP BY case_id
  `);
  
  return NextResponse.json({
    totalConsultations: totalConsultations[0].count,
    week2Validations: validations.find(v => v.milestone_week === 2)?.count || 0,
    averageVisitsPerCase: returnVisits.reduce((sum, r) => sum + r.visit_days, 0) / returnVisits.length,
    // ...
  });
}
```

**File:** `app/api/admin/md-review/queue/route.ts`

```typescript
// GET /api/admin/md-review/queue
// Returns pending consultations needing MD review

export async function GET() {
  const pending = await db.query(`
    SELECT 
      c.*,
      u.satisfaction_score
    FROM consultations c
    LEFT JOIN user_feedback u ON c.case_id = u.case_id
    WHERE c.md_reviewed = false
      AND c.participating_specialists >= 4
      AND c.consensus_percentage >= 0.80
    ORDER BY c.created_at DESC
    LIMIT 50
  `);
  
  return NextResponse.json(pending);
}
```

**File:** `app/api/admin/md-review/route.ts`

```typescript
// POST /api/admin/md-review
// Submit MD review and resolve predictions

export async function POST(req: Request) {
  const { consultationId, approved, clinicalAccuracy, feedbackNotes } = await req.json();
  
  // Store in local database
  await db.query(`
    UPDATE consultations 
    SET md_reviewed = true,
        md_approved = ?,
        md_clinical_accuracy = ?,
        md_feedback_notes = ?
    WHERE consultation_id = ?
  `, [approved, clinicalAccuracy, feedbackNotes, consultationId]);
  
  // Resolve predictions in backend
  const result = await fetch('http://localhost:3000/predictions/resolve/md-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consultationId,
      mdReviewData: {
        approved,
        clinicalAccuracy,
        feedback: feedbackNotes,
        timestamp: new Date().toISOString()
      }
    })
  });
  
  // Update card tier if approved
  if (approved && clinicalAccuracy >= 4) {
    await db.query(`
      UPDATE consultations 
      SET tier = 'verified'
      WHERE consultation_id = ?
    `, [consultationId]);
  }
  
  return NextResponse.json({ success: true });
}
```

### Step 2: Frontend Components

**File:** `app/admin/dashboard/page.tsx`

```tsx
import { SystemOverview } from './components/SystemOverview';
import { PredictionMarketAnalytics } from './components/PredictionMarketAnalytics';
import { CardDistribution } from './components/CardDistribution';
import { EngagementMetrics } from './components/EngagementMetrics';
import { MDReviewQueue } from './components/MDReviewQueue';
import { RecentActivity } from './components/RecentActivity';

export default async function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <h1>OrthoIQ Admin Dashboard</h1>
      
      <SystemOverview />
      
      <div className="grid grid-cols-2 gap-6">
        <PredictionMarketAnalytics />
        <CardDistribution />
      </div>
      
      <EngagementMetrics />
      
      <div className="grid grid-cols-2 gap-6">
        <MDReviewQueue />
        <RecentActivity />
      </div>
    </div>
  );
}
```

**File:** `app/admin/dashboard/components/PredictionMarketAnalytics.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';

export function PredictionMarketAnalytics() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/admin/prediction-market/performance')
      .then(r => r.json())
      .then(setData);
  }, []);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div className="prediction-market-analytics">
      <h2>Prediction Market Analytics</h2>
      
      <div className="agent-leaderboard">
        <h3>Agent Leaderboard</h3>
        {data.topPerformers.map((agent, index) => (
          <div key={agent.agentId} className="agent-card">
            <div className="rank">#{index + 1}</div>
            <div className="agent-name">{agent.agentName}</div>
            <div className="accuracy">{(agent.accuracyRate * 100).toFixed(1)}% accuracy</div>
            <div className="tokens">{agent.tokensEarned} tokens earned</div>
            <div className="trend">{agent.trend}</div>
            <div className="progress-bar">
              <div 
                className="fill" 
                style={{ width: `${agent.accuracyRate * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Token Distribution Chart */}
      {/* Accuracy Trends Chart */}
    </div>
  );
}
```

**Similar pattern for other components...**

---

## Database Schema Updates

### Add columns to consultations table:

```sql
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'standard';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS consensus_percentage DECIMAL(3,2);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS participating_specialists INTEGER;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS total_token_stake DECIMAL(10,2);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_reviewed BOOLEAN DEFAULT false;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_approved BOOLEAN;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_clinical_accuracy INTEGER;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_feedback_notes TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_reviewed_at TIMESTAMP;
```

### Create new tables:

```sql
-- Track tracking page views for return visit metrics
CREATE TABLE tracking_page_views (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) NOT NULL,
  fid VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_case_id (case_id),
  INDEX idx_created_at (created_at)
);

-- Track QR code scans
CREATE TABLE qr_scans (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) NOT NULL,
  scanned_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_case_id (case_id),
  INDEX idx_scanned_at (scanned_at)
);
```

---

## Success Metrics for Phase 3

✅ **Dashboard loads in <2s** with all metrics
✅ **Real-time updates** for recent activity feed
✅ **Agent leaderboard** updates automatically as predictions resolve
✅ **MD review queue** allows batch processing
✅ **Card distribution** accurately reflects tier progression
✅ **Engagement metrics** show validation funnel clearly
✅ **Export functionality** for all charts/metrics

---

## Claude Code Prompts for Phase 3

### Prompt 1: Backend API Routes
```
Create the admin dashboard API routes in app/api/admin/:

1. metrics/overview/route.ts - System overview metrics (consultations, agents, quality)
2. prediction-market/performance/route.ts - Proxy to orthoiq-agents /predictions/market/statistics
3. cards/distribution/route.ts - Calculate tier distribution from consultations table
4. engagement/metrics/route.ts - Validation rates and return visit metrics
5. md-review/queue/route.ts - Pending consultations needing review
6. md-review/route.ts - Submit MD review and resolve predictions

Each route should:
- Query local database using existing database.ts connection
- Proxy to orthoiq-agents backend (localhost:3000) when needed
- Combine data from both sources
- Return properly typed JSON responses

Reference the orthoiq-agents backend endpoints in INTER_AGENT_TOKEN_ECONOMY_SUMMARY.md
```

### Prompt 2: Database Schema Updates
```
Update lib/database.ts to add new columns to consultations table and create new tracking tables:

Consultations table additions:
- tier (varchar, default 'standard')
- consensus_percentage (decimal)
- participating_specialists (integer)
- total_token_stake (decimal)
- md_reviewed (boolean, default false)
- md_approved (boolean)
- md_clinical_accuracy (integer, 1-5 scale)
- md_feedback_notes (text)
- md_reviewed_at (timestamp)

New tables:
- tracking_page_views (for return visit metrics)
- qr_scans (for QR code engagement)

Include migration function that runs safely if columns/tables already exist.
```

### Prompt 3: Dashboard Frontend Components
```
Create the admin dashboard page at app/admin/dashboard/page.tsx with these sections:

1. SystemOverview - Key metrics cards (consultations, quality, tokens)
2. PredictionMarketAnalytics - Agent leaderboard with accuracy and tokens
3. CardDistribution - Tier breakdown with donut chart
4. EngagementMetrics - Validation funnel and return visits
5. MDReviewQueue - Pending consultations for review
6. RecentActivity - Live activity feed

Use shadcn/ui components for UI. Each section should:
- Fetch data from corresponding API route
- Display loading states
- Show charts using recharts library
- Auto-refresh every 30 seconds

Reference the phase_3_admin_dashboard_spec.md for exact layouts and metrics.
```

### Prompt 4: MD Review Interface
```
Create the MD review interface at app/admin/dashboard/components/MDReviewQueue.tsx:

Features:
- List of pending consultations (5 agents, 80%+ consensus, not MD reviewed)
- Filter by urgency, consensus, age
- Click to expand full consultation details
- Approve/reject with clinical accuracy rating (1-5)
- Add feedback notes
- Submit calls POST /api/admin/md-review
- Updates card tier to 'verified' if approved

Include modal for full consultation view showing:
- User question
- All agent responses
- Consensus breakdown
- User feedback
- Red flags (if any)
```

### Prompt 5: Agent Detail Page
```
Create agent detail page at app/admin/agents/[agentId]/page.tsx:

Show comprehensive metrics for individual agent:
- Performance history (accuracy over time)
- Token balance history
- Prediction breakdown by dimension (pain, mobility, function)
- Confidence calibration analysis
- Recent consultations with outcomes

Fetch data from GET /api/admin/agents/[agentId] which proxies to orthoiq-agents backend: GET /predictions/agent/:agentId

Include charts showing trends and specialization patterns.
```

---

## Timeline

**Week 1:**
- Backend API routes ✓
- Database schema updates ✓
- Basic dashboard layout ✓

**Week 2:**
- Frontend components ✓
- Charts and visualizations ✓
- MD review interface ✓

**Week 3:**
- Agent detail pages ✓
- Real-time updates ✓
- Polish and refinements ✓

**Week 4:**
- Testing and bug fixes ✓
- Performance optimizations ✓
- Documentation ✓

---

## Key Notes

1. **Dual Data Sources:** Dashboard combines data from local database (consultations, user feedback) and orthoiq-agents backend (predictions, token economics)

2. **No LoRA/PEFT Focus:** Since agent system is primary, remove any training data export features from old dashboard

3. **Agent-Centric Design:** Everything highlights the multi-agent prediction market - this is your differentiator

4. **Real-time Updates:** Use polling or webhooks to keep metrics fresh (agents earning tokens, predictions resolving, etc.)

5. **MD Review is Critical:** This is how cards upgrade from Complete → Verified tier, so make it smooth and efficient

6. **Public Metrics:** Most metrics can be public (agent performance, card distribution) since blockchain makes this transparent anyway. Admin dashboard just has better visualizations and MD review tools.
