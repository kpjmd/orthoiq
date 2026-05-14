# Intelligence Card Removal Survey + V2 Revival Reference

> **Purpose of this document.** This is both a removal record for the testnet cleanup and a frozen-in-time reference for how the intelligence card system was wired into the OrthoIQ frontend as of 2026-05-13. When the V2 prediction market is ready in 3–6 months and real on-chain stake data starts flowing, this document is the map for reviving the cards: it lists every preserved component file, every removed invocation site, the props/state contracts, the data flow, the API endpoint that remained dormant, and the database `shares` table coupling that was left intact.
>
> **Why the cards were removed (testnet).** The card's headline visual content — tokens staked per agent — was always fabricated client-side by `calculateStakeFromConfidence(c) = 10 * c³` in `lib/intelligenceCardUtils.ts`. With the prediction market removed in pre-testnet hardening, the fabrication became the entire content of the card. Rather than ship a card with fabricated stakes on testnet, the post-feedback flow was simplified to a brief thank-you that sets a 2-week PROMIS milestone expectation, and the profile gallery of past cards was replaced by the existing plain consultation-history list.
>
> **What was preserved (V2-ready).** All 4 card component files, `intelligenceCardUtils.ts`, the `POST /api/share-intelligence-card` route, the admin `CardDistribution.tsx` + `/api/admin/cards/distribution` route, and the `shares` table's `share_type='intelligence-card'` row support all remain untouched. To revive cards, restore the imports and render sites listed in §10 and replace the fabrication function with real on-chain stake reads.
>
> **Cleanup pass status.** Both Phase 1 and Phase 2 completed 2026-05-13 and verified clean via `npx tsc --noEmit`. All fabricated-stake content removed from user-facing surfaces.

---

## Table of contents

1. [Component: IntelligenceCard.tsx](#1-component-intelligencecardtsx)
2. [Component: IntelligenceCardModal.tsx](#2-component-intelligencecardmodaltsx)
3. [Component: WebIntelligenceCard.tsx](#3-component-webintelligencecardtsx)
4. [Component: IntelligenceCardCTA.tsx](#4-component-intelligencecardctatsx)
5. [Library: lib/intelligenceCardUtils.ts](#5-library-libintelligencecardutilsts)
6. [Feedback modal → card flow](#6-feedback-modal--card-flow)
7. [API and database coupling](#7-api-and-database-coupling)
8. [Routes and pages](#8-routes-and-pages)
9. [Stale prediction-market references](#9-stale-prediction-market-references)
10. [Removal surface (testnet cleanup)](#10-removal-surface-testnet-cleanup)
11. [V2 revival notes](#11-v2-revival-notes)
12. [Verification](#12-verification)

---

## 1. Component: IntelligenceCard.tsx

**Path:** `components/IntelligenceCard.tsx`

**Purpose.** SVG-based card component. Renders agent consensus panels, primary prediction, verification status, QR tracking code, tier-based styling. Used in both the modal preview and the profile gallery thumbnail.

**Direct importers (before removal)**
| File | Line | Import |
|---|---|---|
| `components/UserProfileView.tsx` | 7 | `import IntelligenceCard from './IntelligenceCard'` |
| `components/IntelligenceCardModal.tsx` | 5 | `import IntelligenceCard from './IntelligenceCard'` |

**Render sites (before removal)**
- `components/UserProfileView.tsx:210` — profile gallery thumbnail. Conditional: inside `normalConsultations.map(c => …)` where `normalConsultations = consultations.filter(c => c.mode === 'normal')`. Props: `data={cardData} size="small" animated={false}`. `cardData` reconstructed via `reconstructCardDataFromDB(c)` (line 200).
- `components/IntelligenceCardModal.tsx:336` — full-screen modal. Props: `data={cardData} size="medium" animated={true} isMiniApp={isMiniApp}`.

**Utility imports from intelligenceCardUtils.ts**
- `getTierConfig()` — tier visual styling
- `formatCardTimestamp()` — timestamp formatting
- `getAgentFullName()` — agent display names

---

## 2. Component: IntelligenceCardModal.tsx

**Path:** `components/IntelligenceCardModal.tsx`

**Purpose.** Full-screen modal wrapper around `IntelligenceCard`. Handles share button, image export, and action buttons. Used across all post-feedback surfaces and the profile gallery click-to-preview.

**Direct importers (before removal)**
| File | Line | Import |
|---|---|---|
| `components/ResponseCard.tsx` | 8 | `import IntelligenceCardModal from './IntelligenceCardModal'` |
| `components/UserProfileView.tsx` | 8 | `import IntelligenceCardModal from './IntelligenceCardModal'` |

**Render sites (before removal)**
- `components/ResponseCard.tsx:781-789` — single mount, opened by `showIntelligenceCardModal` state. Three trigger buttons:
  - Line 735: fast-mode post-feedback success
  - Line 914: miniapp post-feedback unlock
  - Line 1131: miniapp bottom feedback (after specialist details scroll)
- `components/UserProfileView.tsx:236-263` — profile gallery preview. Conditional: `{selectedCard && (…)}`. `rawConsultationData` is hand-reconstructed from DB fields (lines 240-257) since the gallery doesn't have the full consultation payload.

**State that triggered it**
- `ResponseCard.tsx:142` — `const [showIntelligenceCardModal, setShowIntelligenceCardModal] = useState(false)`. Set to `true` by three onClick handlers (lines 735, 914, 1131).
- `UserProfileView.tsx:86-89` — `selectedCard` state typed `{ cardData: IntelligenceCardData; consultation: ConsultationRecord } | null`. Set to a value by the gallery thumbnail onClick (line 205).

**Utility imports from intelligenceCardUtils.ts**
- `mapConsultationToCardData()` — raw consultation → card data
- `getTierConfig()` — tier badge styling
- `generateIntelligenceCardNFTMetadata()` — imported but unused at present

**API coupling**
- Line 113: `POST /api/share-intelligence-card` on share button click. Payload includes `caseId`, `fid`, `tier`, `consensusPercentage`, `participatingCount`, `totalStake`, `primaryPrediction`. The `totalStake` value was synthesized client-side from the fabricated stake function.

---

## 3. Component: WebIntelligenceCard.tsx

**Path:** `components/WebIntelligenceCard.tsx`

**Purpose.** Simplified HTML-based card for authenticated web users (non-miniapp). Shows prediction summary with upgrade CTAs to platforms. Rendered inline (not modal).

**Direct importers (before removal)**
| File | Line | Import |
|---|---|---|
| `components/ResponseCard.tsx` | 15 | `import WebIntelligenceCard from './WebIntelligenceCard'` |

**Render site (before removal)**
- `components/ResponseCard.tsx:870` — inline render. Conditional gate: `{!isMiniApp && isWebAuthenticated && feedbackSubmitted && cardData && (…)}`. Props: `data={cardData} caseId={caseId || cardData.caseId}`.

**Utility imports from intelligenceCardUtils.ts**
- `getTierConfig()` — badge styling
- `formatCardTimestamp()` — timestamp display

---

## 4. Component: IntelligenceCardCTA.tsx

**Path:** `components/IntelligenceCardCTA.tsx`

**Purpose.** Call-to-action for unauthenticated web users to unlock cards via email verification or platform signup. Pure UI; no utility imports.

**Direct importers (before removal)**
| File | Line | Import |
|---|---|---|
| `components/ResponseCard.tsx` | 14 | `import IntelligenceCardCTA from './IntelligenceCardCTA'` |

**Render site (before removal)**
- `components/ResponseCard.tsx:836` — post-feedback CTA. Conditional gate: `{!isMiniApp && !isWebAuthenticated && feedbackSubmitted && (…)}`. Props: `onVerifyEmail={() => setShowEmailModal(true)}`.

---

## 5. Library: lib/intelligenceCardUtils.ts

**Path:** `lib/intelligenceCardUtils.ts`

### Key exports

| Function | Purpose | Used by |
|---|---|---|
| `calculateStakeFromConfidence(confidence)` | **Fabricated stake** = `10 * confidence³`. Internal helper. | Internal to `intelligenceCardUtils.ts` (lines 353, 371, 504) |
| `getTierConfig(tier)` | Visual styling per rarity tier | IntelligenceCard, IntelligenceCardModal, WebIntelligenceCard, UserProfileView, `lib/exportUtils.ts` |
| `mapConsultationToCardData()` | Raw consultation → `IntelligenceCardData` | ResponseCard (line 215), IntelligenceCardModal (line 78) |
| `reconstructCardDataFromDB()` | Profile gallery card reconstruction from DB fields | UserProfileView (line 200) |
| `generateIntelligenceCardNFTMetadata()` | NFT metadata generation | `lib/exportUtils.ts` (line 2) — imported but not actively invoked |
| `extractPrimaryPrediction()` | Internal helper for `mapConsultationToCardData` | Internal (line 398) |
| `calculateRarityTier()` | Internal helper for `mapConsultationToCardData` | Internal (line 412) |
| `formatCardTimestamp()` | Display timestamp formatting | IntelligenceCard, WebIntelligenceCard, UserProfileView |

### Type definitions

- `IntelligenceCardData` — core card data structure
- `AgentStakeData` — per-agent consensus data
- `CardTier` — `'standard' | 'complete' | 'verified' | 'exceptional'`
- `PrimaryPrediction` — prediction data from highest-stake agent

### Coupling outside the card system

- `lib/exportUtils.ts:2` imports `IntelligenceCardData`, `getTierConfig`, `generateIntelligenceCardNFTMetadata` from this file. `getTierConfig` is actively used at lines 830 and 848 of `exportUtils.ts` — therefore `intelligenceCardUtils.ts` cannot be moved/quarantined; it stays in place.

---

## 6. Feedback modal → card flow

The post-feedback card display all hung off the `feedbackSubmitted` state in `ResponseCard.tsx`. Trace (before removal):

```
User submits feedback in FeedbackModal
  └─ ResponseCard.handleFeedbackSubmitted() (line 287)
      └─ setFeedbackSubmitted(true) (line 288)
          └─ cardData useMemo recomputes (lines 196-234) calling mapConsultationToCardData()
              └─ Surfaces unlock UI per tier:
                  ├─ Fast mode (line 723-742): green panel + "View Intelligence Card" button → setShowIntelligenceCardModal(true)
                  ├─ Web unauth (lines 826-838): green thank-you + <IntelligenceCardCTA>
                  ├─ Web auth (lines 868-871): inline <WebIntelligenceCard>
                  ├─ Miniapp top (lines 902-921): green panel + button → setShowIntelligenceCardModal(true)
                  └─ Miniapp bottom (lines 1119-1138): green panel + button → setShowIntelligenceCardModal(true)
              └─ IntelligenceCardModal mounted at line 781, controlled by showIntelligenceCardModal
```

**Replacement (testnet).** All 5 post-feedback card sites replaced by `<PostFeedbackConfirmation onStartCheckIn={onStartCheckIn} />`. The 4 pre-feedback "Unlock Your Intelligence Card" panels rewritten to "Help Improve Our AI Specialists" / "Share Your Feedback." The `PostFeedbackConfirmation` component shows a thank-you message and optionally a "Take your baseline check-in" button (wired to the existing PROMIS launcher in parent components).

---

## 7. API and database coupling

### API routes
- **`POST /api/share-intelligence-card`** (`app/api/share-intelligence-card/route.ts`)
  - Caller: `IntelligenceCardModal.tsx:113` (share button)
  - Payload: `caseId`, `fid`, `tier`, `consensusPercentage`, `participatingCount`, `totalStake`, `primaryPrediction`
  - Writes a row to `shares` table with `share_type='intelligence-card'`
  - Returns: `shareUrl`, `trackUrl`, metadata
  - **Disposition:** preserved. Harmless if no caller invokes it on testnet; V2 will resume calling it.

### Database
- `shares` table (`lib/database.ts`): supports `share_type='intelligence-card'` (lines 417, 453). `createShare()` function at line 1969 accepts it.
- **Disposition:** preserved. No schema cleanup needed.

---

## 8. Routes and pages

- **`/track/[caseId]/page.tsx`** — PROMIS milestone tracking page. References the card visually only via QR-code URLs generated inside `IntelligenceCard.tsx` (line 475). Does not render a card itself.
- **`/share/[id]/page.tsx`** — share landing page. Renders `PrescriptionGenerator`, not intelligence cards directly. Could serve a shared intelligence card link via `share_type='intelligence-card'` rows, but doesn't render the card visually.
- **`/miniapp/page.tsx`** — Farcaster miniapp. Renders `ResponseCard`, which previously mounted `IntelligenceCardModal`.
- **`/app/page.tsx`** and **`/app/stats/page.tsx`** — no direct card rendering.

**No standalone card pages exist.** Cards were modal/inline only.

---

## 9. Stale prediction-market references

All cleaned up in Phase 1 & 2 (2026-05-13):

| File | What was removed |
|---|---|
| `app/stats/page.tsx:271` | "with prediction market" from Clinical query type description |
| `app/stats/page.tsx:506-511` | About section token-economy language |
| `app/admin/dashboard/components/SystemOverview.tsx` | `averageStakePerConsultation` field + MetricCard |
| `app/api/admin/metrics/overview/route.ts` | `averageStakePerConsultation` from all response payloads |
| `lib/email.ts:359,379` | "full Intelligence Card" from rate-limit warning email |
| `components/WebToMiniAppCTA.tsx:90-95` | "Intelligence Card with shareable insights" 4th bullet |
| `app/admin/dashboard/page.tsx` | `CardDistribution` import + render; subtitle + link label |
| `app/stats/page.tsx:464-501` | Entire Intelligence Card Distribution section + fetch + `totalCards` |

---

## 10. Removal surface (testnet cleanup)

### Phase 1 — completed 2026-05-13

| File | Change |
|---|---|
| `components/ResponseCard.tsx` | Remove 4 imports, state, `cardData` useMemo, modal mount; replace 5 card render sites with `<PostFeedbackConfirmation />`; rewrite 4 pre-feedback panels |
| `components/UserProfileView.tsx` | Remove 3 imports, `selectedCard` state, gallery section, preview modal; 2-column stats row |
| `components/PostFeedbackConfirmation.tsx` | **New file.** Shared inline thank-you with PROMIS check-in link |
| `components/WebHomePage.tsx` | Replace prediction-market language; replace Intelligence Cards tile with Outcome Tracking |
| `app/admin/dashboard/components/SystemOverview.tsx` | Remove `averageStakePerConsultation` field + MetricCard; `md:grid-cols-3` → `md:grid-cols-2` |
| `app/api/admin/metrics/overview/route.ts` | Remove `averageStakePerConsultation` from all response payloads |
| `app/stats/page.tsx` | Line 271 copy fix; lines 506-511 About section rewrite |
| `app/miniapp/page.tsx` | Wire `onStartCheckIn` prop to `<ResponseCard>` |
| `components/WebOrthoInterface.tsx` | Wire `onStartCheckIn` prop to `<ResponseCard>` |

### Phase 2 — completed 2026-05-13

| File | Change |
|---|---|
| `lib/email.ts` | Replace "full Intelligence Card" with "recovery tracking with PROMIS milestones" in HTML + text |
| `components/WebToMiniAppCTA.tsx` | Replace 4th bullet with "Recovery tracking with 2/4/8-week PROMIS check-ins" |
| `app/admin/dashboard/page.tsx` | Remove `CardDistribution` import + render; update subtitle; relabel "Intelligence Cards" link to "MD Review" |
| `app/stats/page.tsx` | Remove `/api/admin/cards/distribution` fetch; remove `totalCards`; remove Intelligence Card Distribution section; remove `cardDistribution` from state shape |

### Files preserved (V2 revival)

| File | Preservation reason |
|---|---|
| `components/IntelligenceCard.tsx` | Untouched. Restore by re-importing from ResponseCard / UserProfileView. |
| `components/IntelligenceCardModal.tsx` | Untouched. Restore the mount at ResponseCard line 781 region. |
| `components/WebIntelligenceCard.tsx` | Untouched. Restore the inline render at ResponseCard line 870 region. |
| `components/IntelligenceCardCTA.tsx` | Untouched. Restore the unauth-web render at ResponseCard line 836 region. |
| `lib/intelligenceCardUtils.ts` | Untouched. Replace `calculateStakeFromConfidence` with on-chain stake reads in V2. |
| `app/api/share-intelligence-card/route.ts` | Untouched. Will resume receiving calls when V2 modal is restored. |
| `app/admin/dashboard/components/CardDistribution.tsx` | Untouched. Restore by re-importing in admin dashboard page. |
| `app/api/admin/cards/distribution/route.ts` | Untouched. Resumes feeding `CardDistribution` and stats-page chart on revival. |
| `lib/database.ts` | Untouched. `shares.share_type='intelligence-card'` support remains. |
| `lib/exportUtils.ts` | Untouched. Continues legitimate use of `getTierConfig`. |

---

## 11. V2 revival notes

When restoring cards in 3–6 months:

1. **Replace fabrication.** `calculateStakeFromConfidence` in `lib/intelligenceCardUtils.ts` was the entire stake-data layer. V2 must replace it with reads from the on-chain stake registry. The function signature returns a number, so the replacement is shape-compatible.
2. **Restore render sites.** Use §10's removed-line references and §2/§3/§4's render-site listings as the map. Each card surface had a different conditional gate (`isMiniApp`, `isWebAuthenticated`, `feedbackSubmitted`) — preserved verbatim in the file history before this cleanup.
3. **Restore `showIntelligenceCardModal` state.** Single `useState` in `ResponseCard`, three trigger buttons across 4 surfaces (fast-mode success, miniapp top, miniapp bottom).
4. **Profile gallery restoration.** Re-add the gallery section that filters `consultations.filter(c => c.mode === 'normal')` and maps each through `reconstructCardDataFromDB`. Add back the `selectedCard` state and preview modal.
5. **Admin metric.** If V2 has real stakes, restore `averageStakePerConsultation` from `agentStats` (orthoiq-agents backend). No DB migration needed.
6. **Stats page copy.** Reinstate prediction-market language with honest framing once stakes are real.
7. **API endpoint.** `POST /api/share-intelligence-card` was never removed — it's ready to receive calls again.
8. **Database `shares.share_type='intelligence-card'`.** Constraint preserved; no migration needed.
9. **Post-feedback flow.** The replacement `<PostFeedbackConfirmation />` can be retired OR kept as a parallel UX surface alongside the card. If retiring, restore the original `feedbackSubmitted ? <CardUnlock /> : <FeedbackPrompt />` branching from git history.
10. **Admin card distribution.** `CardDistribution.tsx` and `/api/admin/cards/distribution/route.ts` preserved. To restore: re-add the import and `<CardDistribution />` render in `app/admin/dashboard/page.tsx`, and revert the subtitle / navbar-link relabels.
11. **Public stats card distribution.** Was a UI block at lines 464-501 backed by `stats.cardDistribution` populated from `/api/admin/cards/distribution`. To restore: re-add the fetch in the `Promise.all`, restore `totalCards`, and restore the section JSX.
12. **Marketing copy.** Two upsell surfaces (`lib/email.ts` rate-limit email and `WebToMiniAppCTA.tsx` 4th bullet) re-advertised the Intelligence Card as a Farcaster-exclusive feature. Restore by reverting the copy edits in those files.

---

## 12. Verification

### Phase 1 (completed 2026-05-13)

1. `npx tsc --noEmit` — clean pass, no errors.
2. Post-feedback flow, all 4 surfaces: submit feedback → green "Thanks — we got your feedback" panel; no card button.
3. PROMIS check-in link: for a pain-related consultation, "Take your baseline check-in" button launches the existing PROMIS baseline flow.
4. Profile page (`/profile/[fid]`): gallery gone; consultation history list renders; pending milestones still actionable.
5. Admin dashboard (`/admin/dashboard`): no "Avg Stake/Case" tile; Token Economics row shows 2 tiles cleanly.
6. Stats page (`/stats`): "Clinical" tile no longer says "with prediction market"; About section reads without token-economy/prediction language.

### Phase 2 (completed 2026-05-13)

7. `npx tsc --noEmit` — clean pass after stats-page state shape change.
8. Rate-limit email (`sendRateLimitWarningEmail`): neither HTML nor text body mentions "Intelligence Card."
9. Upgrade CTA (`WebToMiniAppCTA`): 4 bullets read — fast consultations, comprehensive consultations, blockchain notifications, PROMIS check-ins. No card reference.
10. Admin dashboard (`/admin/dashboard`): subtitle reads "Agent Performance Analytics"; navbar link reads "MD Review"; Card Distribution section absent.
11. Public stats page (`/stats`): Intelligence Card Distribution section gone; no fetch to `/api/admin/cards/distribution` in network panel.
12. Final grep sweep returns hits only in: 4 preserved card component files, `lib/intelligenceCardUtils.ts`, `lib/exportUtils.ts`, `app/api/share-intelligence-card/route.ts`, `app/admin/dashboard/components/CardDistribution.tsx`, `app/api/admin/cards/distribution/route.ts`, and code-comment-only mentions in `app/api/claude/route.ts`, `app/miniapp/page.tsx:105`, `lib/database.ts`.
