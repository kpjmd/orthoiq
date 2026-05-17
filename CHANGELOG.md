# OrthoIQ Changelog

## [2.0.0] - 2026-05-17: Milestone Return Experience

Reframes the week 2/4/8 PROMIS check-ins as a recovery resource rather than a data-collection
touchpoint. Every channel now leads with the patient's own trajectory before asking anything of them.

### Added — Body part extraction

- **`lib/bodyPart.ts`** — `extractBodyPart()` uses Claude Haiku at inference time (temp 0,
  max_tokens 50, 1.5s timeout) to classify the consultation into one of 11 enum values
  (`knee`, `shoulder`, `hip`, `ankle`, `back`, `neck`, `wrist`, `elbow`, `foot`, `hand`, `other`).
  Validates against enum; falls back to `'other'` on timeout or mismatch.
  `bodyPartPhrase(bp)` returns `"your knee"` or `"your"` — never raw `body_part` strings in copy.
- **`lib/database.ts`** — `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS body_part VARCHAR(50)`.
  `storeConsultation()` extended to persist the extracted value.
- **`app/api/claude/route.ts`** — calls `extractBodyPart()` before `storeConsultation()`,
  wrapped in try/catch so extraction failure never blocks a consultation.
- **`scripts/backfill-body-parts.js`** — gated backfill script (requires
  `BACKFILL_BODY_PARTS_ENABLED=true` and `--confirm`/`--dry-run`). Batched 50 rows, 200ms sleep
  between API calls. Supports `--dry-run` → CSV output without DB writes.

### Added — Recovery readouts (LLM-generated, grounded)

- **`lib/readouts/readoutContext.ts`** — `buildReadoutContext()` assembles a frozen, deterministic
  context object from DB + arithmetic only (no LLM): PROMIS T-scores, baseline/current/delta,
  `keyFindings` and `suggestedFollowUp` from `agent_tasks.result_data`, pain-relevance check.
  Excludes PI fields entirely when not pain-related (hallucination prevention).
  Returns a SHA256 `contextHash` for change detection.
- **`lib/readouts/composeReadout.ts`** — Claude Haiku 4.5, temp 0.1, max_tokens 600. Split
  system/user prompt: system carries hard rules + three structural exemplars; user carries the
  JSON context with an **echoed allow-list** (`You may cite ONLY these values: ...`) so the model
  cannot invent numbers, timeframes, or body parts. `deterministicFallback()` returns plain
  delta sentences when the API is unavailable.
- **`app/api/readout/generate/route.ts`** — `POST {consultationId, timepoint}`. Decoupled from
  PROMIS submission: PROMIS data always persists even if Anthropic is down. Idempotent via
  `UNIQUE(consultation_id, timepoint)` (`ON CONFLICT DO NOTHING`). Always returns HTTP 200 with
  `generation_status: 'success' | 'fallback'`.
- **`lib/database.ts`** — `milestone_readouts` table:
  `(consultation_id, timepoint, context_hash, prompt_version, generation_status,
  component1_text, component3_text, honesty_check JSONB, raw_response)`.
  `UNIQUE(consultation_id, timepoint)`. Index on `consultation_id`.
- **`scripts/test-readout.js`** — Manual prerelease gate. Three-layer harness: hallucination
  resistance (unauthorized numbers, future-tense verbs, emoji), adversarial fixtures (empty
  findings, `body_part='other'`, non-pain-related), direction-agreement smoke test.

### Added — Unified landing

- **`lib/landing/buildLandingPayload.ts`** — Single SSR-friendly builder assembles consultation,
  milestone statuses, all PROMIS responses, and all stored readouts for a given case. Used
  directly by `app/track/[caseId]/page.tsx` (SSR) and returned by the new landing endpoint.
- **`app/api/track/[caseId]/landing/route.ts`** — GET endpoint returning `LandingPayload` JSON;
  consumed by the Farcaster miniapp client fetch.
- **`components/RecoveryArcChart.tsx`** — Hand-rolled SVG (no chart library). Fixed x-positions
  for baseline/2wk/4wk/8wk. Two lines: Physical Function T-score (direct) and Pain Interference
  delta (sign-reversed so up = improvement). MCID ±5 reference lines (dashed, shown at week 4+).
  Ghost dashed circle marks the upcoming target timepoint. Framer Motion animated circles.
- **`components/MilestoneLandingView.tsx`** — Shared state machine
  (`context → questionnaire → submitting → readout | already_done`) used by both the web tracking
  page and the Farcaster miniapp. Shows: orienting line with body part + date, original question
  as a typographic blockquote, `RecoveryArcChart`, CTA button. On form submit: optimistically
  injects new PROMIS row into chart state, transitions to shimmer then readout. `already_done`
  phase shows most recent readout + prior readouts in a `<details>` accordion. No celebratory
  language at any phase; readout is shown instead of a completion screen.
- **`app/track/[caseId]/TrackingClient.tsx`** — Rewritten to a thin wrapper around
  `MilestoneLandingView`. Retains privacy toggle (passed as `headerSlot`) and coordination
  summary (passed as `footerSlot`). Old status-table, "Recovery Timeline" heading, and
  "Validation Submitted!" block removed.
- **`app/track/[caseId]/page.tsx`** — Rewritten to call `buildLandingPayload()` directly (SSR)
  and pass the payload to `TrackingClient`.
- **`app/miniapp/page.tsx`** — Milestone deep-link path now fetches the landing payload and
  mounts `MilestoneLandingView`. Direct `PROMISQuestionnaire` auto-mount and "🎉 Check-in
  complete!" block removed.
- **`components/PROMISQuestionnaire.tsx`** — Added `skipCompletionScreen?: boolean` prop (default
  `false`). When `true`, `onComplete` fires immediately after submit and the parent owns the
  post-submit UI. Baseline completion screen behavior unchanged.

### Changed — Notification copy

- **`lib/email.ts`** — `sendMilestoneEmail()` rewritten. Subject: `Week N: How is your knee
  recovery?`. Body: plain text, no marketing chrome. CTA: `Start week N check-in` → links to
  `/track/{caseId}`. Week 4+ emails reference the prior milestone delta inline.
  Sign-off: `— OrthoIQ follow-up`. Removed: "Hi there", "validate your recovery trajectory",
  "helps our AI specialists learn and improve", "Keep up the great work".
- **`lib/notifications.ts`** — `sendMilestoneNotification()` rewritten. Title: `Week N check-in`
  (≤32 chars). Body references body part without forced engagement phrasing.
  `sendNotification()` accepts optional `NotificationContext` to thread `notification_type` and
  `consultation_id` through to `logNotification()`.
- **`app/api/cron/send-milestone-notifications/route.ts`** — Recipient queries now select
  `c.body_part`; both send functions receive it. Dedup changed from
  `title LIKE 'Week N%'` → `notification_type = 'promis_milestone_${day}'`
  keyed on `(fid, consultation_id, notification_type)`.

### Changed — Notification dedup (schema)

- **`lib/database.ts`** — `notification_logs` gains `notification_type VARCHAR(50)` and
  `consultation_id VARCHAR(255)`. All 315 existing rows backfilled to `notification_type =
  'legacy'` so historical dedup is preserved. New index on
  `(fid, consultation_id, notification_type, created_at)`.

---

### Deferred (post-testnet)

The following items from the milestone workbrief are intentionally out of scope for testnet:

| Item | Notes |
|------|-------|
| **Readout Component 2** | Pattern recognition across multiple data points ("your week-4 score is in the top quartile for knee arthroscopy at this timepoint"). Requires a meaningful cohort in `promis_responses` to be useful. |
| **`predicted_recovery_days`** | Backend field on `consultations` — LLM estimate of recovery window at consultation time, used by Component 3 to say "you're N weeks ahead of / behind the predicted trajectory". See separate implementation prompt. |
| **Timezone-aware send timing** | Cron currently fires at UTC 09:00 daily. Per-user timezone lookup and send-time adjustment deferred; keep daily UTC cron for now. |
| **PDF export** | Patient-facing readout PDF (Component 1 + 3 + chart). Deferred pending stable readout format. |
| **On-chain attestation** | Milestone completion attestation on Base. Deferred until post-testnet token model is confirmed. |

---

## [1.9.0] - 2026-05-10: Pre-Testnet Integration Audit (Task 1)

### Changed — Backend auth wiring (Phase 1 backend audit)
- **`lib/agentsClient.ts`** (new) — centralised `agentsFetch()` helper that injects `X-API-Key`
  on every server-to-server call to `orthoiq-agents`. Three keys: `ORTHOIQ_AGENTS_WEB_KEY`,
  `ORTHOIQ_AGENTS_FARCASTER_KEY`, `ORTHOIQ_AGENTS_ADMIN_KEY`, matching the backend's three-key
  auth model introduced in Phase 1 of the agents audit.
- All 10 fetch call sites migrated to `agentsFetch`: `lib/claude.ts` (consultation + status
  polling), `app/api/research/trigger`, `app/api/research/[consultationId]`,
  `app/api/feedback/route.ts`, `app/api/predictions/resolve/follow-up`,
  `app/api/admin/md-review` (admin key), `app/api/admin/research/metrics`,
  `app/api/admin/metrics/overview`.

### Removed — Dead agent backend calls
- `POST /feedback` call from `app/api/feedback/route.ts` — endpoint never existed on the
  backend; local DB write is the source of truth. The `predictions/resolve/user-modal` call
  that was nested inside it now fires directly with proper auth.
- `POST /feedback/milestone` call from `app/api/feedback/milestone/route.ts` — same: 404'd
  silently. Local DB storage is unchanged.

### Fixed — Deleted prediction-market routes
- `app/api/admin/prediction-market/performance/route.ts` — no longer calls the deleted
  `GET /predictions/market/statistics` endpoint; returns static empty payload immediately.
- `app/api/admin/agents/[agentId]/route.ts` — no longer calls the deleted
  `GET /predictions/agent/:id` endpoint; returns static 503 with message.

### Fixed — Free-text 2048-char cap
- `components/WebOrthoInterface.tsx` — main question textarea now has `maxLength={2048}` and
  a live character counter that turns amber at 1900 characters.
- `app/miniapp/page.tsx` — same cap and counter applied to the miniapp question textarea.

### Added
- `.env.local.template` — documented the three new `ORTHOIQ_AGENTS_*_KEY` server-side env vars.
- `TESTNET_AUDIT.md` — tracks all five pre-testnet audit tasks and their completion status.

---

## [1.8.0] - 2026-03-23: Farcaster Notification Fix & Testnet Readiness

### Fixed
- **Farcaster Push Notifications Delivered** — Milestone PROMIS check-in notifications now arrive
  in Warpcast inbox. Three spec violations were causing silent rejection:
  1. `targetUrl` used relative paths (`/miniapp?track=...`) instead of full `https://` URLs
     required by Farcaster's `secureUrlSchema`
  2. Milestone notification `title` exceeded the 32-character limit
     (`"Week 2 Check-in: How are you doing?"` → `"Week 2 PROMIS Check-in"`)
  3. Several response review notification titles also exceeded 32 chars and were shortened
- **Error response body logging** — `sendNotification()` now logs the Farcaster response body on
  failure, making spec violations visible in Vercel logs instead of only status codes

### Removed
- **Daily question reset notifications** — The midnight cron job (`/api/notifications/reset-daily`)
  was sending "Your daily question limit has reset!" to all Farcaster users, but miniapp users
  have had unlimited questions since v1.5.0. Removed the cron schedule from `vercel.json` and
  deprecated `scheduleRateLimitResetNotifications()`. The route remains but is a no-op.

### Milestone — Testnet Ready
Both notification paths are now confirmed working end-to-end:
- **Web users**: Email follow-up notifications via Resend (verified since v1.5.1)
- **Farcaster users**: Warpcast inbox push notifications (confirmed 2026-03-23 with Week 2 PROMIS check-in)

The platform is ready for testnet deployment pending final validation of 4-week and 8-week
milestone notifications and general integration testing. The journey from Claude API experiment
to full subspecialist agent panel with prediction market token exchanges, validated PROMIS
questionnaire follow-up, evidence-based research citations, and informational query pathway
is complete at MVP+ stage.

### Files Modified
| File | Changes |
|------|---------|
| `lib/notifications.ts` | Added `APP_URL` constant, absolute `targetUrl`s, shortened titles to ≤32 chars, error body logging, deprecated reset notifications |
| `vercel.json` | Removed `reset-daily` cron schedule |

---

## [1.7.0] - 2026-03-21: Async Consultation Polling Architecture

### Changed — Comprehensive Consultation Flow (Breaking for Farcaster)

Comprehensive (normal-mode) consultations now use an async fire-and-forget + HTTP polling
architecture instead of a single long-held HTTP request. This eliminates the Farcaster WebView
~90-second hard timeout that was aborting consultations before results arrived.

**Before**: Frontend → `/api/claude` (POST, mode:normal) → Railway waits ~85–95s → response
**After**: Frontend → `/api/claude` (POST, mode:normal) → returns `consultationId` in <2s →
frontend polls `/api/claude/status/:id` every 4s → renders result when `status: 'completed'`

### Added

- **`app/api/claude/status/[consultationId]/route.ts`** — New Next.js proxy route. Forwards
  status requests to Railway's `GET /consultation/:id/status`, transforms the completed
  consultation into the same response shape as the synchronous `/api/claude` POST so the
  frontend can use `parseApiResponse()` unchanged.

- **`fetchConsultationStatus(consultationId)`** in `lib/claude.ts` — Fetches consultation
  status from Railway with 10s timeout.

- **`pollConsultationStatus(consultationId, maxWaitMs=150000)`** helper in both
  `app/miniapp/page.tsx` and `components/WebOrthoInterface.tsx` — Polls every 4s until
  `status: 'completed'`, `'error'`, or `'not_found'`.

- **`processingAsync?: boolean`** added to `ClaudeResponse` type in `lib/types.ts` — Set by
  `tryOrthoIQAgents()` when Railway returns the new async processing response.

### Changed

- **`handleComprehensiveUpgrade`** (miniapp + web) — POST timeout reduced from 120s to 30s;
  detects `initial.status === 'processing'` and enters polling loop instead of awaiting full
  response inline.

- **`tryOrthoIQAgents()`** in `lib/claude.ts` — Added handler for Railway's async processing
  response (`status: 'processing'`, no `triage` key). Returns `processingAsync: true` to signal
  the route handler to return early with the consultationId.

- **`/api/claude` route.ts** — Added early return for `processingAsync` responses before the
  normal response-building block, returning `{ status: 'processing', consultationId }`.

### Fixed

- **Fast mode triage response blank after async deployment** — Railway's fast mode response has
  always included `status: 'processing'` (it fires background comprehensive immediately after
  returning triage). The new `processingAsync` check in `tryOrthoIQAgents` was accidentally
  matching fast mode responses too, causing the triage card to render with an empty response.
  Fixed by adding `&& !result.triage` to the check — fast mode always has a `triage` key,
  normal-mode async never does.

### Files Modified
| File | Changes |
|------|---------|
| `lib/types.ts` | Added `processingAsync?: boolean` to `ClaudeResponse` |
| `lib/claude.ts` | `processingAsync` handler in `tryOrthoIQAgents()`, exported `fetchConsultationStatus()`, `&& !result.triage` fast-mode guard |
| `app/api/claude/route.ts` | Early return for `processingAsync` responses |
| `app/api/claude/status/[consultationId]/route.ts` | New — Railway status proxy |
| `app/miniapp/page.tsx` | `pollConsultationStatus` helper, POST timeout 120s→30s, polling loop |
| `components/WebOrthoInterface.tsx` | Same as miniapp |

### Architecture Notes

- **Cache hits remain synchronous** — The Railway cache check runs before the async path, so
  returning users get instant responses without polling overhead.
- **Railway in-memory TTL** — Consultation results are held in a `Map` for 30 minutes post-
  completion, then cleaned up. Railway restarts lose in-flight jobs; those would return
  `not_found` on next poll and surface as a user-visible error ("please try again").
- **Fast/triage mode unchanged** — Only `mode: 'normal'` is async. The triage step still
  returns synchronously (typically <20s).

---

## [1.6.0] - 2026-03-10: Informational Query Pathway (Backend v0.7.0)

### Added
- **Informational Query Pathway**: Frontend now handles the new `mode: 'informational'` response from the backend (v0.7.0)
  - Queries like "What's the latest on PRP?" are classified at triage and routed to the Research Agent only — no specialists, no prediction market, no token staking
  - Backend returns `queryType: 'informational'` which the frontend uses to adjust the UX

- **New response routing in `lib/claude.ts`**: Added `mode === 'informational'` branch before existing fast/normal handling
  - Reuses `transformFastModeResponse` (informational triage has the same shape), then propagates `queryType` and `querySubtype`

- **`queryType` and `querySubtype` fields**: Added to `ClaudeResponse` type, API proxy response, `ResponseData` interfaces, and `parseApiResponse` in both miniapp and web

### Changed
- **PROMIS guards (4 locations)**: PROMIS questionnaire opt-in is suppressed for informational queries
  - Comprehensive loading timer (miniapp + web)
  - Post-triage-exit PROMIS button (miniapp + web)

- **Comprehensive upgrade skipped**: "See Full Analysis" button is hidden for informational queries — the triage response IS the answer
  - `onSeeFullAnalysis` prop is conditionally omitted from `TriageResponseCard`

- **Research polling starts earlier**: For informational queries, research polling activates at `triage_complete` instead of waiting for `comprehensive_complete`
  - `useResearchPolling` enabled condition extended with informational + triage_complete gate
  - `researchCaseData` memo updated to fall back to `triageResult` for informational queries

- **Research status shown at triage**: Informational queries display a "Searching research literature..." indicator in the triage_complete view

- **State reset**: `queryType` and `querySubtype` properly reset to defaults in `handleAskAnother`

### Files Modified
| File | Changes |
|------|---------|
| `lib/types.ts` | Added `queryType`, `querySubtype` to `ClaudeResponse` |
| `lib/claude.ts` | New `mode === 'informational'` branch |
| `app/api/claude/route.ts` | Pass `queryType`, `querySubtype` in response |
| `app/miniapp/page.tsx` | State, PROMIS guards, skip comprehensive, research polling |
| `components/WebOrthoInterface.tsx` | State, PROMIS guards, skip comprehensive, research polling |

### What Was NOT Changed
- `hooks/useResearchPolling.ts` — same polling mechanism, just different enable conditions
- `components/ResponseCard.tsx` — not rendered for informational queries
- `components/ComprehensiveLoadingState.tsx` — not rendered for informational queries
- `components/TriageResponseCard.tsx` — already handles missing `onSeeFullAnalysis` gracefully

---

## [1.5.3] - 2026-02-11: Notification Toggle Sync Fix

### Fixed
- **Notification Toggle Revert Issue**: Fixed notification toggle showing "Disable" for ~30 seconds then reverting to "Enable"
  - **Root Cause**: The component relied entirely on webhooks as the only save path for notification tokens. If webhooks failed silently (verification timeout, DB error, or never arrived), no token was saved. The background sync (every 30s) would then query the DB, find no enabled tokens, and "correct" the UI back to disabled.
  - **Impact**: Users enabling notifications would see the toggle revert after 30 seconds, making notifications appear broken
  - **Fix**: Implemented client-side token save as the primary path, with webhook as redundant/fallback
  - **Implementation**:
    - Created `/api/notifications/save-token` endpoint for direct client-side token saves
    - Modified `NotificationPermissions` component to save tokens directly from SDK response (`result.notificationDetails`)
    - Added 60-second grace period to background sync to prevent race conditions
    - Fixed `isAppInstalled` to use SDK prop (`context.client.added`) instead of unreliable DB query
    - Enhanced webhook logging with request IDs, timing metrics, and separate error handling for verification vs DB failures
    - Added `checkNotificationStatus()` function to distinguish DB errors from "no tokens" state
    - Status endpoint now returns 500 on DB errors (prevents false corrections by background sync)
  - Modified files: `app/api/notifications/save-token/route.ts` (new), `components/NotificationPermissions.tsx`, `app/api/webhook/route.ts`, `lib/notifications.ts`, `app/api/notifications/status/route.ts`

### Testing Required
- [x] Enable flow: Token appears in DB within 2s via direct save
- [x] Toggle stays "Disable" after 60+ seconds (no revert)
- [ ] Milestone notifications: Mini app users successfully receive notifications at 2, 4, and 8 weeks
- [ ] Deep link: Users can open notification link and complete follow-up questionnaire

### Technical Details
- Client-side save is now the primary path, eliminating single point of failure
- Webhook serves as redundant/secondary path for reliability
- Background sync has 60s grace period after toggles (set via `lastToggleTime` ref)
- Webhook logs include `[Webhook:<id>]` prefix with timing for diagnostic tracking
- Non-ok status responses (500) are ignored by background sync to prevent false corrections on transient DB errors

---

## [1.5.2] - 2026-01-27: Mini App Milestone Notifications & Share Page Fixes

### Fixed
- **Mini App Milestone Notifications**: Implemented webhook handler to register notification tokens from Farcaster mini app users
  - **Root Cause**: The webhook endpoint at `/app/api/webhook/route.ts` was logging events but not saving notification tokens to the database
  - **Impact**: 0 users had notification tokens registered, preventing the milestone notification cron job from sending any notifications to mini app users
  - **Fix**: Updated webhook to parse and handle Farcaster events (`miniapp_added`, `notifications_enabled`, `notifications_disabled`, `miniapp_removed`)
  - **Implementation**: Uses `@farcaster/miniapp-node` to verify webhook signatures and save tokens to `notification_tokens` table
  - Now when users enable notifications in the mini app, tokens are properly registered with `fid`, `token`, `url`, and `enabled=true`
  - The existing milestone notification cron job (`/api/cron/send-milestone-notifications`) can now find users and send notifications at 2, 4, and 8 week milestones
  - Modified files: `app/api/webhook/route.ts`

- **Share Page Prescription Section**: Fixed confusing legacy prescription artwork showing on all share links
  - **Root Cause**: The "Medical Prescription" section with prescription artwork was displaying for ALL share types, including simple response shares from "Share Response" button
  - **Impact**: Users viewing shared responses saw confusing prescription cards that weren't relevant to the simple response content
  - **Fix**: Made prescription section conditional - only shows for `shareType === 'prescription'` or `shareType === 'artwork'`
  - **Benefit**: Response-type shares (from mini app "Share Response") now show only the question and response, making them cleaner and less confusing
  - Share links like `https://orthoiq.vercel.app/share/mkw43p80gnlhiu7lbko` no longer show prescription section
  - Prescription and artwork shares still display the prescription section correctly for legacy shares
  - Modified files: `app/share/[id]/page.tsx`

### Verification

**Milestone Notifications:**
- Created test scripts to verify token registration logic works correctly
- Tokens are saved to database with proper conflict handling (ON CONFLICT DO UPDATE)
- Milestone query correctly finds consultations eligible for notifications when tokens exist
- Next steps: Users need to enable notifications in mini app, then cron job will send milestone notifications

**Share Page Fix:**
- Created test shares for each type (response, prescription, artwork)
- Response shares: No "Medical Prescription:" section (verified)
- Prescription/Artwork shares: "Medical Prescription:" section shows (verified)
- Real share links tested: `mkw43p80gnlhiu7lbko` (response), `mfplnibwiw5jxedk9t` (prescription)

### Technical Details
- The cron job logic was always correct - it just had no tokens to work with
- Webhook now properly handles 4 Farcaster event types with signature verification
- Share page conditional uses database `share_type` field to determine visibility
- Both fixes are backwards compatible with existing data

---

## [1.5.1] - 2026-01-19: Web User Milestone Notifications Fix

### Fixed
- **Web User Consultation Linking**: Consultations created by verified email users now properly populate the `web_user_id` column in the database
  - Updated `storeConsultation()` function to accept optional `webUserId` parameter
  - Modified `/api/claude` route to pass authenticated user's ID when creating consultations
  - Enables milestone notification cron job to correctly identify and notify email-authenticated users at 2, 4, and 8 week milestones
  - Previous consultations remain unlinked (NULL `web_user_id`); new consultations from verified users will receive milestone emails

### Technical Details
- Modified files: `lib/database.ts`, `app/api/claude/route.ts`
- The `consultations.web_user_id` column (added in previous migration) is now properly utilized
- Milestone cron job (`/api/cron/send-milestone-notifications`) uses `INNER JOIN` on `web_user_id` to find eligible users

---

## [1.5.0] - 2026-01-15: Resend Email Authentication Live in Production

### Added
- **Production Email Authentication with Resend**
  - Custom domain `orthoiq.io` verified with Resend for sending magic link emails
  - Magic link authentication fully functional in production
  - "Check your email" UX screen after email entry with resend option
  - Session handling via httpOnly cookies with localStorage fallback

### Fixed
- **Magic Link 404 Error**: Changed email link from `/auth/verify` to `/api/auth/verify-magic-link`
- **Returning User Token Validation**: Removed `email_verified = false` check allowing users to re-authenticate
- **Check Email Screen Persistence**: AuthSection now shows sign-in screen for pending verification users
- **Session Cookie Handling**: `/api/auth/session` now reads from cookie first (for magic link flow), then Authorization header

### Environment Variables Added to Production (Vercel)
- `RESEND_API_KEY` - Resend API key for email delivery
- `FROM_EMAIL` - Set to `OrthoIQ <noreply@orthoiq.io>`

### Known Issues
- Guest users can sign out and back in to reset their 1/1 question limit (should persist for 24 hours)
- Email authenticated users receive "Invalid user identifier format" error when attempting consultations

---

## [Unreleased] - 2026-01-02: Authentication & Intelligence Card Enhancements

### Added
- **Web Email Authentication**
  - Magic link authentication using Resend for web users
  - Database-backed sessions with 90-day persistence (supports full milestone journey)
  - New `web_users` table with email verification tracking
  - New `web_sessions` table for long-lived authentication
  - Email templates: magic link, welcome, milestone follow-ups, rate limit warnings
  - Session management API routes: `/api/auth/send-magic-link`, `/api/auth/verify-magic-link`, `/api/auth/session`, `/api/auth/logout`
  - Extended `WebAuthProvider` with `signInWithMagicLink()` and session validation

- **Platform-Aware Rate Limiting**
  - Miniapp users (Farcaster authenticated): **UNLIMITED** consultations
  - Web verified users (email verified): **10 consultations/day**
  - Web unverified users: **1 consultation/day**
  - Soft notification system instead of hard blocks
  - Upgrade prompts encouraging email verification and Farcaster migration

- **Intelligence Card QR Codes**
  - Real QR code generation using `qrcode` library
  - QR codes link to tracking URL: `https://orthoiq.vercel.app/track/{caseId}`
  - QR section hidden on mobile devices (width < 768px)
  - Dynamic card height to prevent content overflow with many agents

- **Cron Jobs**
  - Session cleanup: Daily at 3am UTC (`/api/cron/cleanup-sessions`)
  - Milestone emails: Daily at 9am UTC (`/api/cron/send-milestone-emails`)

### Fixed
- **Scope Validation Architecture**
  - Removed redundant frontend orthopedic keyword filter (`lib/security.ts`)
  - Backend AI now handles all scope validation (queries like "heart palpitations" now properly routed)
  - **Architecture Principle**: Backend (Railway) is the single source of truth for orthopedic scope validation
  - Frontend retains only safety-critical checks: emergency detection, spam filtering, inappropriate content

### Changed
- **Route Consolidation**
  - Removed `/mini` route entirely, consolidated to `/miniapp` only
  - Updated all internal references and redirects
  - Service worker, middleware, and meta tags updated

- **Database Schema Extensions**
  - Added `web_user_id` column to `consultations`, `questions`, and `feedback_milestones` tables
  - Backward compatible: Miniapp users continue using `fid`, web users use `web_user_id`

- **Rate Limit System**
  - Extended `checkPlatformRateLimit()` with `isEmailVerified` parameter
  - Added `softWarning` and `upgradePrompt` fields to rate limit responses
  - Web users now tracked separately from miniapp users

### Technical Details

#### New Database Tables
```sql
CREATE TABLE web_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  daily_question_count INTEGER DEFAULT 0,
  last_question_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE web_sessions (
  id UUID PRIMARY KEY,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  web_user_id UUID NOT NULL REFERENCES web_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Environment Variables Required
- `RESEND_API_KEY` - API key from resend.com for email sending
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `CRON_SECRET` - Secret for authenticating cron job requests (optional, Vercel sets headers)

#### Email Templates
All emails use professional but approachable tone:
- Magic link (15-minute expiration)
- Welcome email after verification
- Milestone follow-ups (Days 14, 28, 56)
- Rate limit warnings with upgrade CTAs

### Dependencies Added
- `resend` - Email service provider
- `qrcode` - QR code generation
- `@types/qrcode` - TypeScript definitions

### Testing Required
- [ ] Unverified user flow (1 question limit)
- [ ] Email verification flow
- [ ] Verified user flow (10 question limit)
- [ ] Rate limit soft notifications
- [ ] Session persistence across browser restarts
- [ ] Milestone email delivery
- [ ] QR code generation and mobile hiding
- [ ] Intelligence Card dynamic height with many agents

---

## [Unreleased] - Phase 3: Admin Dashboard & Agent Integration

### Added
- **Admin Dashboard** (`/admin/dashboard`)
  - Central dashboard for MD review queue, metrics, and system monitoring
  - MD review queue showing consultations pending physician validation
  - Consultation-based review system with urgency levels (urgent, semi-urgent, routine)
  - Real-time statistics: pending reviews, approved today, total reviewed, avg review time

- **MD Review System** (`/admin/md-review`)
  - New consultation review interface with clinical accuracy rating (1-5 scale)
  - Approval/rejection workflow with feedback notes
  - Automatic tier upgrades based on approval + accuracy
  - Integration with agent prediction resolution
  - Display of milestone validations and user feedback

- **Agent Prediction Resolution Integration**
  - User feedback modal now triggers `/predictions/resolve/user-modal` endpoint
  - MD reviews trigger `/predictions/resolve/md-review` with proper data format
  - Follow-up milestones trigger `/predictions/resolve/follow-up` with correct payload
  - Token distribution and agent learning loop connected end-to-end

- **New API Endpoints**
  - `POST /api/admin/md-review` - Submit MD review with prediction resolution
  - `GET /api/admin/md-review?consultationId=...` - Fetch consultation for review
  - `GET /api/admin/md-review/queue` - Get pending MD review queue with stats
  - `PATCH /api/admin/md-review/complete` - Legacy completion endpoint (deprecated)

### Fixed
- **Auth Persistence** - AdminAuthProvider hydration fix prevents logout on page refresh
- **MD Review Queue** - Now shows correct consultation-based data instead of legacy question-based
- **Duplicate Consultation Keys** - Deduplication logic in queue API prevents React key errors
- **Navigation** - ConsultationReview uses Next.js Link for proper client-side routing
- **Legacy Redirects** - `/admin` now redirects to `/admin/dashboard`

- **Agent Integration Fixes** (2025-12-27)
  - `app/api/feedback/route.ts` - Added missing `/predictions/resolve/user-modal` call to trigger token resolution
  - `app/api/admin/md-review/route.ts` - Fixed `clinicalAccuracy` scale conversion (1-5 → 0-1) for backend compatibility
  - `app/api/predictions/resolve/follow-up/route.ts` - Corrected payload structure to match backend expectations

### Changed
- **Consultation Schema Updates**
  - Added `md_reviewed`, `md_approved`, `md_clinical_accuracy`, `md_feedback_notes`, `md_reviewed_at` columns
  - Tier progression: standard → complete → verified → exceptional
  - Tier upgrades triggered by MD approval with accuracy ≥ 4/5

- **Feedback Flow**
  - FeedbackModal now properly sends prediction resolution requests
  - User satisfaction and outcome success tracked for agent learning
  - Token rewards returned and stored in consultation_feedback table

- **Review Workflow**
  - Moved from legacy queue-based system to consultation-based system
  - Review completion updates consultation record directly
  - MD feedback integrated with agent backend for continuous learning

### Technical Details

#### Environment Variables
- `ORTHOIQ_AGENTS_URL` - URL for orthoiq-agents backend (default: http://localhost:3000)
- Backend must be running for prediction resolution and token distribution

#### Database Tables Modified
- `consultations` - Added MD review columns, tier tracking
- `consultation_feedback` - Stores user feedback and token rewards
- `feedback_milestones` - Tracks follow-up validations and progress

#### Agent Resolution Endpoints
All three prediction resolution endpoints now properly connected:
1. **User Modal**: `/predictions/resolve/user-modal` - Triggered on feedback submission
2. **MD Review**: `/predictions/resolve/md-review` - Triggered on MD approval/rejection
3. **Follow-up**: `/predictions/resolve/follow-up` - Triggered on milestone validation

### Deprecated
- `/api/admin/md-review/complete` (PATCH) - Use POST `/api/admin/md-review` instead
- Legacy queue-based MD review system

---

## Previous Versions

### [Phase 2] - Multi-Agent Consultation System
- Comprehensive mode with 5 specialist agents
- Fast mode with single ortho specialist
- Agent coordination and consensus tracking
- Prescription generation and NFT support

### [Phase 1] - Core OrthoIQ Platform
- Farcaster Frame integration
- Basic consultation interface
- Claude API integration
- Question/response storage
