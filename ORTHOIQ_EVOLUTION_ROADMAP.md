# OrthoIQ Platform Evolution Roadmap

## Executive Summary

OrthoIQ is evolving from a dual-track consultation tool into a unified, longitudinal clinical AI platform. This document outlines the strategic UX and backend enhancements that will consolidate the user experience, integrate standardized patient-reported outcome measures, and position OrthoIQ as a research-grade learning health system.

---

## Current State

### Frontend (OrthoIQ)
- **Fast Consultation**: Returns OrthoTriage Master response in ~17 seconds. User receives a quick triage-level answer.
- **Comprehensive Consultation**: All 5 agents process the query in parallel. A summary response is generated from all agent outputs, and individual agent responses are viewable separately. Processing time exceeds 60 seconds.
- **Feedback Modal**: Presented after consultation. Unlocks the Intelligence Card upon completion.
- **Milestone Follow-ups**: Arbitrary follow-up questions at 2, 4, and 8 weeks.

### Backend (OrthoIQ-Agents)
- **5 Core Agents**: OrthoTriage Master, Movement Detective, Pain Whisperer, Strength Sage, Mind Mender.
- **Predictive Market Token Exchanges**: Agents exchange tokens during inter-agent communication, calibrated by user feedback, MD review, and milestone follow-ups.
- **Current Blockchain**: Mock blockchain implementation.

### Untapped Potential
- The OrthoTriage Master already generates follow-up questions for both inter-agent use and patient-directed inquiry, but these are not surfaced to users or utilized for enriched agent responses.

---

## Planned Enhancements

### 1. Consolidated Consultation Flow

**Rationale**: The current fast/comprehensive split forces users to choose a consultation type upfront without knowing which they need. A unified flow with optional depth eliminates this decision fatigue and keeps users engaged throughout processing.

**New Flow**:

```
User submits query
    │
    ▼
OrthoTriage Master response (~17s)
  + Follow-up questions presented
  + Inter-agent questions routed internally (invisible to user)
    │
    ├─ EXIT RAMP 1: User exits
    │   → Feedback Modal → Intelligence Card
    │   (equivalent to current "fast" consult)
    │
    ▼
User answers follow-up questions (or skips)
    │
    ▼
Enriched query sent to agents for comprehensive processing
    │
    ▼
During processing wait (~60s):
    PROMIS baseline questionnaire opt-in
    (replaces idle wait / token exchange animation)
    │
    ├─ Decline → Results displayed when ready
    ▼
PROMIS baseline captured (10 questions, ~2 min)
    │
    ▼
Structured Brief + Full Agent Responses
  + Research Agent findings (when available)
    │
    ├─ EXIT RAMP 2: User exits
    │   → Feedback Modal → Intelligence Card
    │
    ▼
Optional: Follow-up question to specific agent
    │
    ▼
Feedback Modal → Intelligence Card
    │
    ▼
MD Review (async feedback loop)
    │
    ▼
PROMIS follow-ups at 2, 4, 8 weeks
```

**Key Design Principles**:
- **Single entry point**: No more choosing between fast and comprehensive.
- **Progressive depth**: Users control how deep they go via natural exit ramps.
- **Engaged waiting**: Follow-up questions and PROMIS baseline replace passive waiting with productive interaction.
- **Follow-up question curation**: Surface only the top 3-5 most relevant patient-directed questions from the OrthoTriage Master. Inter-agent questions should be routed programmatically to the relevant agents without user visibility.
- **Skip option always available**: Every additional step (follow-ups, PROMIS) should have a clear "Skip" or "Get results now" path.

### 2. Structured Brief (Replaces Comprehensive Summary)

**Rationale**: The current narrative summary is redundant with the full agent responses and becomes unwieldy as more agents are added. A structured brief serves as a navigation layer, helping users prioritize which agent responses to read.

**Format**:

```
STRUCTURED BRIEF
─────────────────
Key Finding:      [One-line primary assessment]
Immediate Action: [What to do now]
Agents Consulted: [Icons/badges for each responding agent]

Movement:    [1-2 line summary] ──► View Full Response
Pain Mgmt:   [1-2 line summary] ──► View Full Response
Strength:    [1-2 line summary] ──► View Full Response
Psychology:  [1-2 line summary] ──► View Full Response
Research:    [X relevant studies found] ──► View Full Response
Wearables:   [Activity data summary] ──► View Full Response (future)

Follow-up:   [Primary recommendation for next steps]
```

**Benefits**:
- Scales gracefully as agents are added (Research, Wearables).
- Each agent line acts as a clickable entry point to the full response.
- Reduces information overload while preserving access to detail.
- Consistent structure across all consultations.

### 3. PROMIS Integration

**Rationale**: Replacing arbitrary milestone questions with the standardized PROMIS (Patient-Reported Outcomes Measurement Information System) questionnaire transforms OrthoIQ data into research-grade longitudinal outcomes data.

**Why PROMIS**:
- Widely validated and accepted in orthopedic and sports medicine research.
- Simple: only 10 questions per administration.
- Standardized scoring allows benchmarking and cross-study comparison.
- Covers domains directly relevant to orthopedic presentations.

**Recommended PROMIS Domains**:
- **Physical Function** (default for all orthopedic queries)
- **Pain Interference** (default for all queries)
- Optional domain-specific modules selected by OrthoTriage Master based on query context:
  - Upper extremity function (shoulder, elbow, wrist queries)
  - Mobility (hip, knee, ankle queries)
  - Fatigue (post-surgical, chronic condition queries)

**Baseline Capture Timing**: During the agent processing wait, after the user has answered follow-up questions. This timing is optimal because:
1. The user is already waiting for results (productive use of dead time).
2. The user has received initial value (triage response) and is invested.
3. It occurs before comprehensive results, so responses are a true baseline uncontaminated by agent recommendations.
4. It positions OrthoIQ as a longitudinal clinical companion.

**Longitudinal PROMIS Schedule**:
| Timepoint | Purpose | Prediction Market Impact |
|-----------|---------|--------------------------|
| Baseline (during processing) | Establish pre-consultation functional state | Reference point |
| 2 weeks | Early response assessment | Initial calibration signal |
| 4 weeks | Mid-term progress | Moderate weight token adjustment |
| 8 weeks | Outcome assessment | Heavy weight token adjustment |

**Research & Validation Potential**:
- PROMIS deltas at 2/4/8 weeks provide objective outcome measures.
- Correlation between agent recommendations and PROMIS improvement validates the predictive market token exchange as a learning mechanism.
- Data structure supports future IRB-approved research protocols.
- Publishable outcome: "Patients following OrthoIQ recommendations showed X-point PROMIS improvement at 8 weeks."

### 4. Feedback Loop Architecture

**Current Feedback Loops**:
| Loop | Signal Type | Timing |
|------|------------|--------|
| Agent token exchanges | Inter-agent calibration | During query processing |
| Feedback modal | Subjective user satisfaction | Post-consultation |
| MD review | Expert clinical validation | Async post-consultation |
| Milestone follow-ups | Arbitrary questions | 2, 4, 8 weeks |

**Evolved Feedback Loops**:
| Loop | Signal Type | Timing | Prediction Market Weight |
|------|------------|--------|--------------------------|
| Agent token exchanges | Inter-agent calibration | During query processing | Internal calibration |
| Follow-up question answers | Enriched input (not formal feedback) | Pre-comprehensive results | Captured as context, not token exchange* |
| Feedback modal | Subjective user satisfaction | Post-consultation | Low-moderate weight |
| MD review | Expert clinical validation | Async post-consultation | High weight |
| PROMIS baseline | Standardized functional state | During processing wait | Reference point |
| PROMIS 2/4/8 week | Standardized outcome delta | Longitudinal | Highest weight |

*Note on follow-up answers: The user's answers to OrthoTriage follow-up questions are best treated as enriched input to improve agent response quality rather than as a formal prediction market feedback loop. The data should be captured and associated with the consultation record. A formal token exchange event around this interaction may be considered in the future once user interaction patterns with follow-ups are better understood, but the existing feedback mechanisms at post-response, MD review, and PROMIS milestones provide strong calibration signals without adding complexity.

### 5. New Agents

**Research Agent** (next to be added):
- Connected to PubMed API and/or OpenEvidence API.
- Surfaces relevant peer-reviewed literature alongside agent responses.
- Response appears as its own section in the Structured Brief.
- Expected slight increase to comprehensive processing time.

**Wearables Agent** (future, separate API):
- Collects and processes activity monitor data pertinent to orthopedics.
- Could auto-populate some PROMIS-adjacent data points (step counts, activity levels, sleep quality).
- Potential to provide objective baseline data that complements self-reported PROMIS scores.
- Response appears as its own section in the Structured Brief.

---

## Implementation Roadmap

### Phase 1: Research Agent (Backend)
**Scope**: OrthoIQ-Agents backend
**Work**:
- Integrate Research Agent with PubMed API and/or OpenEvidence API.
- Establish Research Agent participation in predictive market token exchanges.
- Define inter-agent communication protocols for the Research Agent (how it receives queries from OrthoTriage Master, how its findings inform other agents).
- Test response time impact on overall processing.

**Why first**: This is backend-only work that doesn't disrupt the current frontend UX. It lays the groundwork for showing research data in the Structured Brief. The Research Agent's output will also help validate whether the Structured Brief format works well for a growing number of agents.

### Phase 2: Structured Brief (Frontend)
**Scope**: OrthoIQ frontend
**Work**:
- Replace the narrative comprehensive summary with the Structured Brief format.
- Design the brief to include a slot for the Research Agent (even if initially showing "Research: Coming soon" or hidden until Phase 1 is complete).
- Ensure each agent summary line links to the full agent response.
- Test with existing comprehensive consultation flow before consolidation.

**Why second**: This is a contained frontend change that improves the existing comprehensive consult immediately. It's also a prerequisite for the consolidated flow, since the new flow relies on the Structured Brief as the primary results view. Building it against the current comprehensive flow lets you validate the format before introducing flow changes.

### Phase 3: Consolidated Flow + PROMIS (Frontend + Backend)
**Scope**: Full stack
**Work**:
- **Consolidate consultation entry point**: Remove fast/comprehensive selection. Single "Start Consultation" entry.
- **Follow-up question presentation**: Surface top 3-5 patient-directed questions from OrthoTriage Master response. Route inter-agent questions internally.
- **Two-stage API flow**: First call returns triage + follow-ups. Second call sends enriched query (original + follow-up answers) to all agents.
- **PROMIS baseline integration**: Present PROMIS questionnaire during processing wait as opt-in. Store baseline scores associated with the consultation record.
- **Exit ramp logic**: Handle users who exit at triage (no comprehensive results), skip follow-ups (agents process original query only), or decline PROMIS.
- **Replace milestone follow-ups**: Convert 2/4/8 week milestones from arbitrary questions to PROMIS questionnaire. Calculate and display PROMIS deltas from baseline.
- **Update notification system**: Milestone notifications should reference PROMIS completion rather than generic follow-up.

**Why third**: This is the most significant UX change and benefits from having the Structured Brief and Research Agent already in place. The consolidated flow is the new user experience, and it should launch with all the pieces ready.

**Sub-phases to consider**:
- **3a**: Consolidated flow with follow-up questions (no PROMIS yet). Validates the two-stage consultation UX.
- **3b**: PROMIS baseline during processing wait. Validates questionnaire timing and completion rates.
- **3c**: PROMIS milestone replacement. Completes the longitudinal outcomes loop.

### Phase 4: Blockchain Advancement (Backend)
**Scope**: OrthoIQ-Agents backend
**Work**:
- Migrate predictive market token exchanges from mock blockchain to Base Sepolia testnet.
- Validate that all feedback loops (post-response, MD review, PROMIS deltas) correctly trigger token adjustments on-chain.
- Establish smart contract logic for PROMIS-weighted token exchanges.

**Why fourth**: The mock blockchain has served development well. Moving to testnet is an infrastructure maturity step that benefits from having all feedback loops (including PROMIS) finalized first. This way, the smart contract logic can account for all calibration signals from the start.

### Phase 5: Wearables Agent (Backend + Frontend)
**Scope**: Full stack, separate API integration
**Work**:
- Integrate Wearables Agent API for activity monitor data collection and processing.
- Add Wearables section to Structured Brief.
- Explore auto-population of activity-related data points from wearables to complement PROMIS self-reports.
- Define Wearables Agent participation in predictive market token exchanges.

**Why last**: This is the most complex integration (separate API, device connectivity, data pipeline) and depends on the consolidated flow and Structured Brief being stable. It also benefits from the testnet blockchain being operational so token exchanges are production-ready from day one.

---

## Additional Recommendations

### Data Architecture for Research Readiness
As PROMIS data accumulates, consider structuring the data model to support future IRB applications:
- De-identified consultation records linked to PROMIS baselines and follow-ups.
- Agent recommendation logs with timestamps.
- MD review annotations.
- Token exchange history correlated with outcomes.
- This dataset structure supports retrospective research studies without requiring re-engineering.

### User Onboarding for the Consolidated Flow
The shift from two consultation types to a single progressive flow will need clear onboarding:
- Brief tooltip or first-time walkthrough explaining the flow.
- Visual progress indicator showing where the user is in the consultation path.
- Clear labeling of optional steps ("Answer these for a more tailored response" rather than making it feel mandatory).

### Agent-Selective Deep Dives (Future Consideration)
After the consolidated flow is established, consider allowing users to direct follow-up questions to specific agents post-consultation. For example: "Tell me more about the injection alternatives" directed to Pain Whisperer. This turns the consultation into a conversation and increases engagement and platform stickiness.

### PROMIS Completion Incentives
PROMIS follow-up completion rates will be critical for research validity. Consider:
- Tying PROMIS completion to Intelligence Card updates (the card evolves with new data).
- Showing users their own PROMIS trajectory over time as a personal progress dashboard.
- Push notifications at milestone timepoints with easy one-tap access to the questionnaire.

### Wearables + PROMIS Correlation (Future Research Opportunity)
Once both wearables data and PROMIS scores are being collected, there is an opportunity to study correlations between objective activity data and self-reported outcomes. This is a publishable research angle and could further validate the platform.

---

## Summary

OrthoIQ is evolving through five phases from a dual-track consultation tool into a unified clinical AI platform with standardized outcome tracking. The consolidated flow keeps users engaged, the Structured Brief scales with new agents, PROMIS integration makes data research-grade, and the predictive market token exchanges become validatable through real patient outcomes. Each phase builds on the previous, minimizing risk while steadily advancing the platform's clinical and research capabilities.
