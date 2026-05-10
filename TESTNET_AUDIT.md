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

## Task 3 — Prediction Market UI Cleanup ✅ COMPLETE

**What was removed (2026-05-10):**
- [x] Deleted `app/admin/dashboard/components/PredictionMarketAnalytics.tsx`; dashboard now renders
  `<CardDistribution />` standalone where the 2-column grid was.
- [x] Removed Agent Consensus Leaderboard section from `app/stats/page.tsx`.
- [x] Removed Prediction Market Statistics section (incl. "On-Chain Token Economics" teaser) from
  `app/stats/page.tsx`.
- [x] Deleted `app/admin/agents/[agentId]/page.tsx` and its stub route
  `app/api/admin/agents/[agentId]/route.ts` — detail page had no live data and was already 503.
- [x] Deleted `app/admin/agents/page.tsx` — index page depended on dead endpoint and linked only to
  the now-deleted detail page.
- [x] Deleted `app/api/admin/prediction-market/performance/route.ts` (static fallback proxy) — no
  remaining callers.
- [x] Cleaned all orphaned `AgentPerformance` type, `topAgents`/`networkStats` fields, leaderboard
  helper vars, and the prediction-market fetch from `Promise.all` in `app/stats/page.tsx`.
- [x] Confirmed `components/FeedbackModal.tsx` does not render `cascadingResolution`,
  `recommendMDReview`, or `totalAgentsResolved` (verified: safe).
- [x] Confirmed `app/admin/md-review/ConsultationReview.tsx` handles `{recorded: true}` correctly
  (verified: safe).
- `npx tsc --noEmit` passes with zero errors after cache clear.

---

## Task 4 — Performance / Cost Audit ✅ COMPLETE

**Backend cost baseline:** ~$0.14/comprehensive consultation (Sonnet 4.6 + Haiku 4.5).

**Already confirmed good:**
- Double-consultation guard in place: `triageResult.fromAgentsSystem && consultationId &&
  !startsWith('fallback-')` → polls instead of re-POSTing (`WebOrthoInterface.tsx:526–528`,
  `miniapp/page.tsx:725–727`).
- Polling interval: 4000ms (`WebOrthoInterface.tsx:501`). Target met.
- No keystroke-based API calls — all inputs are submit-gated.

**Fixes applied (2026-05-10):**

- [x] **Research polling 3000ms → 5000ms** (`lib/researchService.ts:75`): cuts average
  poll count from 3–9 to 2–5 per consultation with negligible UX impact (~2 s extra
  worst-case latency on an 8–60 s wait).

- [x] **"See Full Analysis" double-click guard** (`WebOrthoInterface.tsx:515–517`,
  `miniapp/page.tsx:708–710`): added early-return if `consultationStage` is already
  `comprehensive_loading` or `comprehensive_complete`. Prevents a rapid double-click
  from firing two `/api/claude` POSTs (~$0.28 instead of $0.14) on the fallback path
  (`!fromAgentsSystem` or `fallback-` prefix IDs). Agents-system path was already safe
  (both calls poll same `consultationId`).

- [x] **useEffect dep tightening** (`miniapp/page.tsx:517`): replaced `context` object
  and `getUserTier` function deps with `context?.user?.fid` primitive, preventing
  repeated `/api/rate-limit-status` + `/api/user/preferences` GETs on each render burst.

**Confirmed safe (no action):**
- Farcaster race: `!isSDKLoaded` early-return prevents form render before context resolves;
  `handleTriageSubmit` re-checks `!fid` as a second gate.
- `/api/mini/health`: pure `process.env` introspection, zero callers, not auto-invoked
  on miniapp entry.

**`npx tsc --noEmit` passes with zero errors.**

---

## Task 5 — Smart Contract Audit ✅ COMPLETE

**Location:** `/Users/kpj/orthoiq-agents/contracts/OrthoIQAgentToken.sol`

**Contract verdict:** SAFE for testnet. Built on OpenZeppelin v5 ERC20 + Ownable
under Solidity ^0.8.20 (overflow protection built in). No reentrancy surface
in `mint`/`burn`/`authorize` (no external calls). `MAX_SUPPLY` cap enforced
with `<=`. `burn` is self-only (`_burn(msg.sender, ...)`). Permission model
correct: `onlyOwner` on minter management, mint requires
`authorizedMinters[msg.sender] || msg.sender == owner()`.

**Findings and fixes applied (2026-05-10):**

- [x] **F1 — HIGH: Stale fallback ABI in `blockchain-utils.js:14–20`** — old code
  emitted only a `logger.warn` if compiled artifact missing, leaving downstream
  with a wrong hardcoded ABI (`mint(address, uint256) returns (bool)` vs actual
  `mint(address, uint256, string)`) and a truncated bytecode placeholder.
  Replaced with **fail-fast throw at module load**, directing operator to run
  `npm run compile:contract`.

- [x] **F2 — HIGH: Wrong constructor args in `blockchain-utils.js:288`** —
  `createAgentTokenContract` passed `[name, symbol, parseEther("1000000")]` to
  a 0-arg constructor; auto-deploy code path would revert. Stripped the broken
  deploy code; method now delegates to `createMockTokenContract()` which binds
  to `TOKEN_CONTRACT_ADDRESS`. Hardhat (`scripts/deploy.cjs`) is the deploy path.

- [x] **F5 — INFO: Dead env var `INITIAL_TOKEN_SUPPLY`** — removed from
  `agent-config.js:42`. Contract hardcodes 100K initial mint and 1M MAX_SUPPLY,
  so the env var was silently ignored. Confirmed no other readers via grep.

- [x] **F8 — BLOCKER (discovered during verification): Hardhat config ESM/CJS
  mismatch** — `package.json` has `"type": "module"` but `hardhat.config.js`,
  `scripts/deploy.js`, `authorize-agents.js`, `check-balances.js` all use CJS
  `require()`. Hardhat HH19 errored on every command. Renamed all four to
  `.cjs` and updated package.json scripts. `npx hardhat compile` now succeeds.

**Findings deferred (post-testnet):**
- **F3 — LOW: `Ownable` (single-step):** typo'd `transferOwnership(0x0)` would
  permanently brick owner. Acceptable for Sepolia ($0 stakes). Use
  `Ownable2Step` on mainnet redeploy.
- **F4 — LOW: No per-mint or per-minter cap:** compromised agent key could
  drain `MAX_SUPPLY - totalSupply()` in one tx. Mitigated by 1M cap and
  zero-value testnet token. Add per-minter daily cap before mainnet.
- **F6 — INFO: No contract tests:** `/test/` empty. OZ base-class tests cover
  most paths, but project-specific tests for the custom reason-tracking mint,
  cap enforcement, and minter authorization are owed before mainnet.
- **F7 — INFO: `balanceOfReadable` precision loss:** integer-divides
  `balanceOf / 10**18`. View-only; intentional cosmetic display.

**Verification performed:**
- `npx hardhat compile` succeeds — produces clean artifact at
  `artifacts/contracts/OrthoIQAgentToken.sol/OrthoIQAgentToken.json`.
- Module load test: `import('./src/utils/blockchain-utils.js')` → `LOAD_OK`
  with artifact present; throws clear error when artifact removed.
- `grep -rn "createAgentTokenContract\|tokenEconomics.initialSupply\|INITIAL_TOKEN_SUPPLY" src scripts`
  → only the (intentional) caller in `token-manager.js:509` remains; zero
  hits for `initialSupply`/`INITIAL_TOKEN_SUPPLY`.

---

## Deployment gate

All five tasks must be signed off before:
1. `git push` of `orthoiq-agents` from local to remote (currently at commit `71d3193`)
2. Vercel/Railway deploy of updated frontend

| Task | Status |
|---|---|
| Task 1 — Integration audit | ✅ Done |
| Task 2 — Security review | ✅ Done |
| Task 3 — Prediction UI cleanup | ✅ Done |
| Task 4 — Performance/cost | ✅ Done |
| Task 5 — Smart contract | ✅ Done |
