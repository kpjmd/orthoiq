# OrthoIQ Frontend Implementation Context

## Current State Summary

### Platform Overview
OrthoIQ is an AI-powered orthopedic and sports medicine consultation platform operating across:
- **Farcaster/Base miniapp** for crypto-native users
- **Web application** targeting Instagram following
- Built with **Railway deployment** and **Neon Serverless PostgreSQL**
- Backend: **OrthoIQ-Agents** (5 specialized AI agents + Research Agent)
- Frontend: **OrthoIQ** (React-based consultation interface)

### Backend Completion Status
✅ **Phase 1A Complete**: Research Agent fully implemented and deployed
- PubMed API integration operational
- Asynchronous research findings with 2-3 curated citations
- Token economics integrated (see docs/research-agent-api.md for full API spec)
- Fire-and-forget architecture (trigger → poll pattern)

### Current Frontend Flow (To Be Replaced)
```
User Question Input
    ↓
[CHOICE: Fast or Comprehensive]
    ↓
Fast (17s):                          Comprehensive (67s):
- OrthoTriage Master only            - All 5 agents process
- Quick triage response              - Individual agent responses
                                     - Narrative summary (redundant)
    ↓                                    ↓
Feedback Modal → Intelligence Card
```

**Problems with current flow:**
- Forces upfront decision without knowing which they need
- Narrative comprehensive summary is redundant with full agent responses
- No utilization of OrthoTriage Master follow-up questions (already generated)
- No standardized outcome tracking (PROMIS)
- Prediction market token exchanges are invisible to users
- No post-consultation engagement mechanism

---

## Target Architecture (To Be Implemented)

### New Consolidated Flow
```
User Question Input
    ↓
OrthoTriage Master Response (~17s)
  + Follow-up questions presented
  + Agent confidence indicators (from token stakes)
    ↓
EXIT RAMP 1A: User exits
    → 3-minute chatbot with OrthoTriage Master (scoped to consultation)
    → Feedback Modal → Intelligence Card
    ↓
OR: User continues to comprehensive
    ↓
[PROMIS Baseline opt-in during processing wait]
    ↓
Comprehensive Results:
  - Structured Brief (replaces narrative summary)
  - Research Agent findings (asynchronous, polls every 2s)
  - Individual agent responses (clickable from brief)
    ↓
EXIT RAMP 2: User reviews results
    ↓
POST-CONSULTATION OPTIONS:

Free Tier:
  → 3-min chatbot with OrthoTriage Master
  → Feedback Modal → Intelligence Card

Premium Tier (future):
  → 10-min chatbot with any specialist agent
  → Prediction market staking interface
  → Enhanced Intelligence Card
```

---

## Implementation Phases

### Phase 1A: Research Agent Backend ✅ COMPLETE
Backend implementation finished. See `research-agent-api.md` for full API spec.

### Phase 1B: Token Balance Display ✅ DEFERRED
Will be addressed in Phase 4 alongside full prediction market UI.

### Phase 2: Structured Brief + Confidence Indicators ✅ COMPLETE
- `StructuredBrief.tsx` implemented with agent summaries and confidence indicators
- Research Agent section with async polling and citation display
- Intelligence Card with agent stake visualization

### Phase 3: Consolidated Flow + PROMIS + Chatbot ✅ COMPLETE
**Sub-phases**:
- **3.1** ✅: Two-stage API architecture (triage → comprehensive)
- **3.2** ✅: Post-consultation chatbot (ConsultationChatbot component)
- **3.3** ✅: PROMIS questionnaire — baseline + 2/4/8 week follow-ups
  - `lib/promis.ts`, `components/PROMISQuestionnaire.tsx`, `app/api/feedback/promis/route.ts`
  - Physical Function 10a + conditional Pain Interference 6a
  - T-score computation, interpretation bands, delta vs baseline
- **3.4** ✅: UI/UX fixes (snake_case agent text, chatbot placement, research agent in feedback modal)
- **3.5** 🔄: UX polish (PROMIS state persistence across stage transition — FIXED; ongoing testing)

### Phase 3.4: Stats + Admin Dashboard Elevation ← NEXT
**Scope**: Surface new data layers added in Phases 3.1–3.3 across `/stats` and `/admin/dashboard`

#### `/stats` page upgrades
- **Research Agent panel**: consultations with citations found, avg citations per consult, avg research quality score, PubMed studies reviewed
- **PROMIS outcomes panel**: baseline capture rate (% of comprehensive consultations), avg Physical Function T-Score, avg Pain Interference T-Score, follow-up completion funnel (baseline → 2wk → 4wk → 8wk), % showing clinically meaningful improvement (≥5 points)
- **Prediction market preview**: "Outcome Stakes" section framed as an upcoming feature — shows consultation categories where outcomes are measurable, teasing the staking mechanic before testnet launch
- **Agent consensus leaderboard**: which agents most frequently agree vs. dissent, confidence score distribution

#### `/admin/dashboard` upgrades
- **Research Agent metrics**: queries processed, avg response time, PubMed success rate, citations returned per tier (basic/premium), token distribution for research
- **PROMIS funnel**: consultations with baseline captured, 2-week check-in completion rate, 4-week, 8-week; data quality (% with pain interference also completed)
- **T-score population view**: histogram of physical function T-scores across all patients, pain interference distribution for pain-related cases
- **Rate limit admin**: reset rate limits UI (route already exists: `app/api/admin/reset-rate-limits/`)

**Key files to modify**: `app/stats/page.tsx` (or equivalent), admin dashboard route/component

---

### Phase 3.5: UX Polish Pass ← IN PROGRESS
**Scope**: End-to-end flow refinement from homepage → consult → PROMIS → feedback → intelligence card

#### Known issues to address
- PROMIS questionnaire state was lost on loading→complete stage transition (FIXED: shared DOM block)
- PROMIS placement before results in comprehensive_complete (FIXED: moved after ResponseCard)
- Continued testing of chatbot follow-up feel and question pre-fill UX
- Intelligence card animation and readability
- Mobile responsiveness of full consultation flow in miniapp

---

### Phase 3.6: Pre-Testnet Infrastructure (Required Before Phase 4)
**Scope**: Platform hardening — three items that become critical once real token stakes are involved

#### Item 1: Database-Backed Rate Limiting for `/chat` endpoint
**Problem**: `app/api/chat/route.ts` uses in-memory rate limiting, which resets on every Railway deployment restart. With frequent deploys, users effectively have unlimited chatbot access between deploys — and post-testnet with real stakes, that's an exploitable gap.
**Fix**: Migrate `/chat` rate limiting to the same database-backed pattern used by the consultation rate limiter in `lib/database.ts`. Add a `chat_rate_limits` table (or reuse existing `rate_limits` table with a `type` discriminator column) keyed on `(user_id, date)`.
**Files**: `app/api/chat/route.ts`, `lib/database.ts`
**Effort**: ~2 hours

#### Item 2: Actionable PROMIS Follow-Up Notifications
**Problem**: The milestone notification cron (`app/api/cron/send-milestone-notifications/route.ts`) exists but likely sends no actionable content for PROMIS follow-ups. Users who complete a baseline have no reliable reminder at 2 weeks, making the follow-up funnel collapse — and PROMIS follow-up data is the input to prediction market settlement.
**Fix**:
- Verify cron sends Farcaster notifications (via Warpcast API) for users with a `promis_responses` baseline row and no follow-up at the expected timepoint
- Add `notification_sent_at` tracking per timepoint in `promis_responses` or a separate `promis_notifications` table to prevent duplicate sends
- Notification payload: deep link to tracking page (`/track/[caseId]`) with the timepoint pre-selected
- Web users without Farcaster: email reminder (Resend integration, low priority) or in-app banner on next visit
**Files**: `app/api/cron/send-milestone-notifications/route.ts`, `lib/database.ts`
**Effort**: ~4 hours

#### Item 3: Error Monitoring
**Problem**: Silent failures in the research agent, chatbot, or PROMIS submission are currently invisible. Post-testnet with real user stakes, these failures have financial consequences.
**Options**:
1. **Sentry** (recommended): `@sentry/nextjs` — 15-minute setup, captures unhandled exceptions, API route errors, slow requests. Free tier sufficient for current scale.
2. **DB error log table**: `error_events` table with `(timestamp, route, error_message, user_id, context_json)` — zero external dependency, queryable from admin dashboard, but no alerting.
**Minimum viable**: Sentry for exception capture + custom DB table for business-logic failures (PROMIS submission failures, research agent timeouts, chat rate limit hits).
**Files**: `sentry.client.config.ts`, `sentry.server.config.ts`, `next.config.js`, `lib/database.ts`
**Effort**: ~2 hours for Sentry; ~1 hour for DB table

---

### Phase 4: Testnet — Real Token Exchanges
**Scope**: Deploy prediction market smart contracts to Base testnet; connect frontend staking UI
**Dependencies**:
- Phase 3.4 stats/admin complete (needed to demonstrate platform health pre-launch)
- Phase 3.6 infrastructure hardening complete (rate limiting, notifications, error monitoring)
- Smart contracts audited and deployed to Base Sepolia testnet
- PROMIS settlement criteria auto-generation working (criteria already specced in this doc)

**Frontend work**:
- Staking interface in Intelligence Card (stake on your own outcome criteria)
- Token balance display for authenticated users (Farcaster FID → wallet lookup)
- Outcome settlement flow: PROMIS follow-up result → auto-evaluate criteria → resolve market
- Transaction confirmation UI (wagmi/viem integration)

**User staking on their own outcomes** (being explored):
- Users stake $ORTHO on their own recovery criteria at time of consultation
- Settlement at 4-week or 8-week PROMIS milestone
- Creates skin-in-the-game engagement loop, generates research-grade outcome data with financial incentive alignment

---

### Phase 5: Prediction Market UX (Full Mainnet)
**Scope**: Full user staking interface post-testnet validation
**Dependencies**: Testnet results, smart contract audit

### Phase 6: Wearables Agent (Long-term Future)

---

## Key Technical Specifications

### Research Agent Integration (Frontend)

**Trigger Call** (after consultation completes):
```javascript
POST https://orthoiq-agents-api.railway.internal/research/trigger
{
  "consultationId": "consultation_1234567890",
  "caseData": { /* from consultation */ },
  "consultationResult": { /* full consultation response */ },
  "userTier": "basic" // or "premium"
}

Response: { "status": "pending", "estimatedSeconds": 15 }
```

**Polling Loop**:
```javascript
GET https://orthoiq-agents-api.railway.internal/research/:consultationId
// Poll every 2 seconds, timeout after 20 seconds
// Response evolves: pending → complete/failed
```

**Complete Response Schema**:
```javascript
{
  "status": "complete",
  "research": {
    "intro": "## Key Findings\n\nRecent research shows...",  // Markdown format
    "citations": [
      {
        "pmid": "38234567",
        "title": "ACL Reconstruction Outcomes...",
        "authors": "Smith J, Doe A, et al.",
        "journal": "JBJS",
        "year": "2024",
        "qualityScore": 9.5,
        "pubmedUrl": "https://pubmed.ncbi.nlm.nih.gov/38234567/",
        // ... 15 total fields
      }
    ],
    "studiesReviewed": 18,
    "tier": "basic"
  }
}
```

### Structured Brief Format
```typescript
interface StructuredBrief {
  keyFinding: string;          // One-line primary assessment
  immediateAction: string;     // What to do now
  marketStatus?: string;       // "Active" | "Not applicable"
  agentConsensus: string;      // "High (4/5 aligned)" | "Mixed"
  
  agentSummaries: Array<{
    specialist: string;        // "Movement Detective"
    summary: string;           // 1-2 sentences
    confidence: "high" | "medium" | "low";
    confidenceScore: number;   // 0-100 (from token stakes)
    hasFullResponse: boolean;  // Link available
  }>;
  
  research?: {
    status: "pending" | "complete" | "failed";
    studiesFound?: number;
    summaryPreview?: string;   // First 50 chars of intro
  };
  
  followUp: string;            // Primary next steps recommendation
}
```

## PROMIS Questionnaire Specifications

### Selected Instruments
1. **PROMIS Physical Function Short Form 10a** (required for all users)
2. **PROMIS Pain Interference Short Form 6a** (conditional on pain-related query)

**Rationale**: Physical Function is orthopedic-specific with high sensitivity to musculoskeletal changes. Pain Interference adds depth for pain cases without diluting functional assessment.

### Presentation Logic
```javascript
function determinePROMISQuestionnaires(caseData) {
  const required = ['physicalFunction']; // Always
  
  if (caseData.painLevel > 0 || 
      caseData.symptoms?.toLowerCase().includes('pain') ||
      caseData.primaryComplaint?.toLowerCase().includes('pain')) {
    return [...required, 'painInterference']; // Progressive: PF first, then ask about PI
  }
  
  return required;
}
```

### Settlement Criteria Generation
OrthoTriage Master auto-suggests prediction criteria based on consultation:
```javascript
// Example auto-generated criteria:
{
  settlementTimepoint: "4week",
  criteria: [
    {
      metric: "physicalFunction",
      operator: ">=",
      threshold: 5,
      description: "Physical function improves by 5+ T-score points"
    },
    {
      metric: "painInterference",
      operator: ">=",
      threshold: 5,
      description: "Pain interference reduces by 5+ T-score points"
    }
  ],
  requiresBoth: true // AND logic for compound outcomes
}
```

### Token Economics Visibility (Phase 2)

**Abstracted Confidence Indicators**:
```javascript
// Backend provides token stakes per agent
// Frontend converts to abstracted confidence:

function calculateConfidence(tokenStake, totalStaked) {
  const percentage = (tokenStake / totalStaked) * 100;
  
  if (percentage >= 80) return { level: "high", symbol: "⬆", score: percentage };
  if (percentage >= 60) return { level: "medium", symbol: "→", score: percentage };
  return { level: "low", symbol: "⬇", score: percentage };
}
```

**Display Examples**:
- Movement Detective: `High confidence ⬆ 89%`
- Strength Sage: `Medium confidence → 67%`
- Mind Mender: `Low confidence ⬇ 42%`

---

## Current Codebase Structure

### Frontend (OrthoIQ Repository)
```
src/
├── components/
│   ├── ConsultationInterface.jsx    // Main consultation flow (TO BE REFACTORED)
│   ├── FeedbackModal.jsx            // Post-consultation feedback (KEEP)
│   ├── IntelligenceCard.jsx         // NFT card display (ENHANCE)
│   └── Stats.jsx                    // Statistics page (ENHANCE)
├── services/
│   ├── api.js                       // API client (ADD research endpoints)
│   └── blockchain.js                // Token queries (ADD)
└── utils/
    └── formatting.js                // Text formatting helpers
```

### Backend (OrthoIQ-Agents Repository) ✅
```
src/
├── agents/
│   ├── triageAgent.js               // OrthoTriage Master
│   ├── painWhispererAgent.js
│   ├── movementDetectiveAgent.js
│   ├── strengthSageAgent.js
│   ├── mindMenderAgent.js
│   └── researchAgent.js             // ✅ Complete
├── utils/
│   ├── agent-coordinator.js         // Multi-agent orchestration
│   ├── research-tokens.js           // Research token distribution
│   └── tokenManager.js              // General token economics
└── index.js                         // Express server with endpoints
```

---

## Design Principles

### User Experience
1. **Progressive depth**: Users control engagement via natural exit ramps
2. **No forced decisions**: Remove fast/comprehensive choice
3. **Productive waiting**: Fill processing time with PROMIS/follow-ups
4. **Transparent AI**: Show prediction market activity without overwhelming
5. **Skip always available**: Every optional step has clear skip path

### Technical
1. **Backend-first validation**: All new features working in backend before frontend work
2. **Component reusability**: Chatbot UI works for triage and specialists
3. **Graceful degradation**: Research Agent failure doesn't block consultation
4. **Mobile-first**: Farcaster miniapp is primary interface
5. **Performance**: Maintain <20s perceived wait for comprehensive results

### Token Economics
1. **Visible not intrusive**: Confidence indicators integrate naturally
2. **Education not promotion**: Explain prediction markets when relevant
3. **Forfeit = standard**: Non-completion means stake loss (aligns with prediction market norms)
4. **Premium value**: Specialist chatbots worth paying for

---

## Success Metrics (Phase 2 Focus)

### User Engagement
- Comprehensive consultation completion rate (target: >60% from triage)
- Research Agent citation click-through rate (target: >40%)
- Chatbot utilization rate (target: >30% of completed consultations)

### Technical Performance
- Structured Brief render time (<1s)
- Research Agent polling success rate (>95%)
- Confidence indicator accuracy (token stakes → displayed confidence)

### Platform Health
- Research Agent token earnings (should increase with usage)
- Token balance queries (user interest in $ORTHO)
- Zero regressions in existing fast consultation flow during transition

---

## Claude Code Implementation Strategy

### Terminal Setup
- **Terminal 1**: OrthoIQ frontend (React)
- **Terminal 2**: OrthoIQ-Agents backend (monitoring only - already deployed)

### Testing Approach
1. **Component isolation**: Build and test each component independently
2. **Mock API responses**: Use fixed consultation data for UI development
3. **Integration testing**: Connect to Railway-deployed backend for end-to-end tests
4. **Gradual rollout**: Feature flag new flow, A/B test against current flow

### Code Quality Standards
- TypeScript for new components (gradual migration)
- Comprehensive error boundaries for async operations (research polling)
- Accessibility: ARIA labels, keyboard navigation, screen reader support
- Mobile responsive: Tailwind breakpoints for all layouts
- Performance: Lazy load full agent responses, optimize re-renders

---

## Next Steps for Claude Code (Phase 2)

### Step 2.1: Create StructuredBrief Component
**Inputs**: 
- `consultationResult` (existing comprehensive response)
- `researchStatus` (pending/complete/failed + data if complete)

**Outputs**:
- Structured layout with agent summaries
- Confidence indicators from token stakes
- Clickable links to full agent responses
- Research section with async update capability

### Step 2.2: Add Research Polling Service
**New file**: `src/services/researchService.js`
- `triggerResearch(consultationId, caseData, consultationResult, userTier)`
- `pollResearch(consultationId, { intervalMs, timeoutMs })`
- Error handling for timeout/failure

### Step 2.3: Integrate Research into Consultation Flow
**Modify**: `src/components/ConsultationInterface.jsx`
- Trigger research after comprehensive processing starts
- Pass polling state to StructuredBrief
- Handle research complete → update UI

### Step 2.4: Add Token Balance Display
**New component**: `src/components/TokenBalance.jsx`
- Read user wallet balance (placeholder for now - mock data)
- Link to Uniswap for token purchase
- Show balance in Stats page

### Step 2.5: Enhance Stats Page
**Modify**: `src/components/Stats.jsx`
- Add "Token Economics" section
- Add "Research Agent Performance" metrics
- Show agent confidence leaderboard

---

## Open Questions for Discussion

1. **Component library**: Continue with current stack or introduce shadcn/ui for new components?
2. **State management**: Keep React context or introduce Zustand/Redux for complex flow?
3. **Animation**: Should confidence indicators animate on mount? Subtle or prominent?
4. **Research pending state**: Show skeleton loader or animated "searching databases..."?
5. **Mobile optimization**: Collapse agent summaries on mobile or show all by default?

---

## Reference Documents

Attach these files to the chat:
1. `docs/research-agent-api.md` (Research Agent backend specification)
2. `docs/promis-questionnaires.md` (PROMIS 10 Physical Function and Pain short forms)
3. This context document

---

## Final Notes

The Research Agent backend is production-ready and deployed to Railway. All work in this phase is frontend-focused, connecting the existing backend capabilities to a redesigned user interface that better represents the sophisticated AI agent ecosystem underneath.

The Structured Brief is the cornerstone of Phase 2 - it needs to be polished, performant, and extensible for future agents (Wearables Agent eventually). Get this right, and the rest of the roadmap flows naturally.

Token visibility starts subtle in Phase 2 (abstracted confidence) and becomes more prominent in Phase 4 (prediction market staking). This gradual introduction educates users without overwhelming them.

PROMIS integration (Phase 3) is where the platform truly becomes a longitudinal learning health system, but the UI patterns established in Phase 2 (progressive depth, async updates, clear CTAs) will make that implementation much smoother.