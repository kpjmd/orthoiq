# OrthoIQ Evolution Roadmap

Timeline of major platform milestones and architectural decisions.

---

## Phase 1 — Core Platform
- Farcaster Frame integration
- Basic consultation interface with Claude API
- Question/response storage in Neon PostgreSQL

## Phase 2 — Multi-Agent Consultation System
- 5 specialist agents: Triage, Pain Whisperer, Movement Detective, Strength Sage, Mind Mender
- Fast mode (single triage agent) and Normal/Comprehensive mode (full multi-specialist)
- Prediction market with token staking for agent confidence
- Prescription generation and NFT support

## Phase 3 — Admin, Feedback, & Recovery Tracking
- **3.0** Admin Dashboard and MD Review system
- **3.1** Two-stage consultation UX (triage → comprehensive upgrade)
- **3.2** Research Agent integration with PubMed polling
- **3.3** PROMIS questionnaire (Physical Function 10a, Pain Interference 6a) with baseline + follow-up milestones
- **3.4** Consultation chatbot for follow-up questions
- **3.5** FID-based user profile system

## Phase 4 — Web Platform & Authentication
- Web interface (`WebOrthoInterface`) with guest and email auth
- Magic link authentication via Resend
- Platform-aware rate limiting (miniapp unlimited, web verified 10/day, web guest 1/day)
- Intelligence Card with QR codes
- Milestone email notifications

## Phase 5 — Intelligence & Research Enhancements
- Intelligence Card gallery, count fix, MD review linkage, mobile dismiss
- Research metrics live data on /stats
- PROMIS & consensus leaderboard upgrades
- Claude model upgrade to Haiku 4.5

---

## 2026-03-10 — Informational Query Pathway (v1.6.0)

**Backend:** v0.7.0 introduced query classification at triage. Queries like "What's the latest on PRP?" are now classified as `mode: 'informational'` and routed to the Research Agent only — no specialists, no prediction market, no token staking.

**Frontend changes (this release):**
- New `mode === 'informational'` branch in `lib/claude.ts`
- `queryType` / `querySubtype` propagated through API proxy and stored in frontend state
- PROMIS questionnaire suppressed for informational queries (4 guard locations)
- "See Full Analysis" button hidden — triage response is the final answer
- Research polling activates at `triage_complete` for informational queries (instead of waiting for `comprehensive_complete`)
- Research status indicator shown inline on triage_complete view

**Next steps:**
- [ ] Update `/stats` page to show informational vs clinical query breakdown
- [ ] Update `/admin` dashboard to surface informational query metrics
- [ ] Consider distinct visual treatment for informational response cards (e.g., "Informational Response" label)
- [ ] Phase 2: Use `querySubtype` for finer-grained UX (e.g., "treatment_comparison", "general_knowledge")
