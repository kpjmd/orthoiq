# OrthoIQ Changelog

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
