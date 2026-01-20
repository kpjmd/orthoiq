# OrthoIQ Changelog

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
