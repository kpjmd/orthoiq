# OrthoIQ Pre-Testnet Frontend Audit

Tracks the five audit tasks to complete before pushing the `orthoiq-agents` backend
(currently local-only at commit `71d3193`) to remote and deploying to testnet.

The backend just completed Phases 1–3 of its own security/correctness audit, which introduced
auth requirements, Zod validation, prediction-market route removals, and response-shape changes
that all require frontend remediation.

---

## Task 1 — Integration Audit ✅ COMPLETE

**What changed in backend:** Every protected route requires `X-API-Key`; two prediction-market
routes deleted; three refactored to return `{success, recorded}` only; `blockchainRecord` removed
from `/recovery/complete`; Zod caps free-text at 2048 chars.

**What was fixed:**
- [x] Created `lib/agentsClient.ts` — central `agentsFetch()` helper that injects `X-API-Key` on
  every server-to-server call. Three keys: `ORTHOIQ_AGENTS_WEB_KEY`, `ORTHOIQ_AGENTS_FARCASTER_KEY`,
  `ORTHOIQ_AGENTS_ADMIN_KEY` (matching the backend's three-key model).
- [x] Migrated all 10 fetch call sites to `agentsFetch` — `lib/claude.ts`, `research/trigger`,
  `research/[consultationId]`, `feedback/route.ts`, `predictions/resolve/follow-up`,
  `admin/md-review` (caller='admin'), `admin/research/metrics`, `admin/metrics/overview`.
- [x] Removed dead `POST /feedback` and `POST /feedback/milestone` calls — these 404'd on the
  backend; local DB writes were already the source of truth.
- [x] Added `maxLength={2048}` + character counter (amber at 1900+) to both main question
  textareas (`WebOrthoInterface.tsx`, `app/miniapp/page.tsx`).
- [x] Replaced deleted-endpoint proxy routes with immediate static fallbacks (no backend call):
  `app/api/admin/prediction-market/performance/route.ts` and
  `app/api/admin/agents/[agentId]/route.ts`.
- [x] Updated `.env.local.template` with the three new `ORTHOIQ_AGENTS_*_KEY` vars.

**Remaining before testnet:**
- [ ] Set `ORTHOIQ_AGENTS_WEB_KEY`, `ORTHOIQ_AGENTS_FARCASTER_KEY`, `ORTHOIQ_AGENTS_ADMIN_KEY`
  in `.env.local` (values must match backend's `WEB_API_KEY`, `FARCASTER_API_KEY`, `ADMIN_API_KEY`)
- [ ] Set same three keys in Vercel / Railway environment

---

## Task 2 — Frontend Security Review ✅ COMPLETE

**Findings and fixes applied (2026-05-10):**

- [x] **C1 — Admin API routes unprotected:** Created `lib/adminAuth.ts` (HMAC-signed httpOnly
  `orthoiq_admin_session` cookie). Modified `password-auth` route to set the cookie on success.
  Added `requireAdmin()` to all 26 admin API routes. Updated admin dashboard layout to use
  `GET /api/admin/whoami` (server-side cookie check) instead of `localStorage` flag.
  Added `GET /api/admin/whoami` and `POST /api/admin/logout` routes.

- [x] **C2 — `/api/feedback` IDOR:** Added ownership check — web consultations require matching
  session cookie; Farcaster consultations require `patientId` to match `consultation.fid`.

- [x] **C3 — Unauthenticated `/api/notifications/test`:** Deleted the route entirely.

- [x] **H1 — Web session token + email in `localStorage`:** Rewrote `WebAuthProvider.tsx` to use
  httpOnly session cookie only. Removed all `localStorage.setItem/getItem` for session token and
  user object. Updated `/api/auth/session` to drop the `Authorization: Bearer` fallback and stop
  returning `sessionToken` in response. Updated `/api/auth/logout` to use `getSession()` (cookie).

- [x] **H2 partial — npm audit:** Ran `npm audit fix`. Reduced from 8 to 2 vulnerabilities (both
  remaining are Next.js DoS — require `--force` upgrade to next@15.5.18; deferred as a separate
  change with regression testing).

- [x] **H3 — Debug/test routes:** Deleted `app/api/debug/route.ts` and `app/api/test-flow/route.ts`.

**Deferred (post-testnet):**
- Next.js major upgrade (`npm audit fix --force` → next@15.5.18): do with a full regression test.
- `/api/research/[consultationId]` ownership check: requires miniapp to pass Farcaster JWT in
  research polling requests; polled from plain `fetch` in `lib/researchService.ts`.
- Console.log cleanup (PHI in logs)
- IP_HASH_SALT hardcoded fallback removal

**Remaining before testnet:**
- [ ] Add `ADMIN_SESSION_SECRET` (or reuse `ADMIN_PASSWORD_HASH`) to `.env.local` and Vercel/Railway

---

## Task 3 — Prediction Market UI Cleanup 🔲 TODO

**Scope:** Remove UI that rendered data from the now-deleted backend routes.

**Components to remove or repurpose:**
- `app/admin/dashboard/components/PredictionMarketAnalytics.tsx` — remove from dashboard
- Prediction market section in `app/stats/page.tsx` (lines 611–649)
- Agent consensus leaderboard in `app/stats/page.tsx` (lines 325–391)
- `app/admin/agents/[agentId]/page.tsx` — page calls the stub route; remove or redirect
- Confirm `components/FeedbackModal.tsx` does not render `cascadingResolution`,
  `recommendMDReview`, or `totalAgentsResolved` (verified: it doesn't — safe)
- Confirm `app/admin/md-review/ConsultationReview.tsx` handles `{recorded: true}` response
  correctly (verified: it only checks success/error — safe)

---

## Task 4 — Performance / Cost Audit 🔲 TODO

**Backend cost baseline:** ~$0.14/comprehensive consultation (Sonnet 4.6 + Haiku 4.5).

**Already confirmed good:**
- Double-consultation guard in place: `triageResult.fromAgentsSystem && consultationId &&
  !startsWith('fallback-')` → polls instead of re-POSTing (`WebOrthoInterface.tsx:524–526`,
  `miniapp/page.tsx:723–725`).
- Polling interval: 4000ms (`WebOrthoInterface.tsx:501`). Target met.
- No keystroke-based API calls — all inputs are submit-gated.

**Still to audit:**
- Research polling: 3000ms in `lib/researchService.ts:75` — consider bumping to 5000ms.
- Check whether any route fires two consultation POSTs if the Farcaster context is slow to
  resolve (race between `isReady` flag and form submission).
- Verify the `/api/mini/health` route doesn't trigger a full consultation on the miniapp entry.

---

## Task 5 — Smart Contract Audit 🔲 TODO

**Location:** `/Users/kpj/orthoiq-agents/contracts/`

**Scope:**
- Standard ERC-20 vulnerabilities: reentrancy, integer overflow, access control on mint/burn
- Authorization model: who can mint? Are agent addresses allowlisted?
- ABI match: does what `blockchain-utils.js` imports match the compiled artifact?
- Hardcoded values that should be configurable (initial supply, decimals, owner)

**Constraint:** Do NOT push backend to remote until this task is complete.

---

## Deployment gate

All five tasks must be signed off before:
1. `git push` of `orthoiq-agents` from local to remote (currently at commit `71d3193`)
2. Vercel/Railway deploy of updated frontend

| Task | Status |
|---|---|
| Task 1 — Integration audit | ✅ Done |
| Task 2 — Security review | ✅ Done |
| Task 3 — Prediction UI cleanup | 🔲 |
| Task 4 — Performance/cost | 🔲 |
| Task 5 — Smart contract | 🔲 |
