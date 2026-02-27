# Phase 3 Implementation Context for Claude Code

## Project State After Phase 2

You have successfully completed:
- ✅ Phase 1: Intelligence Card data mapping and SVG component
- ✅ Phase 2: Tracking page with outcome validation and privacy controls

## Architecture Overview

### Dual Data Source System

OrthoIQ operates with TWO data sources that must be combined:

**1. Local Database (Neon/PostgreSQL)**
- Location: Via `lib/database.ts` connection
- Contains: User consultations, feedback, milestone validations, tracking views
- Purpose: Frontend data persistence, user tracking, privacy controls

**2. orthoiq-agents Backend (Express.js)**
- Location: `http://localhost:3000` (development) or Railway URL (production)
- Contains: Agent predictions, token economics, prediction market statistics
- Purpose: AI agent orchestration, token distribution, prediction resolution

**Dashboard Must Combine Both:**
```typescript
// Example: System Overview Metrics
const localData = await db.query('SELECT COUNT(*) FROM consultations');
const agentData = await fetch('http://localhost:3000/tokens/statistics').then(r => r.json());

return {
  totalConsultations: localData[0].count,           // From local DB
  averageAgentsPerConsultation: agentData.avgAgents, // From orthoiq-agents
  totalTokensIssued: agentData.totalTokens          // From orthoiq-agents
};
```

### Available orthoiq-agents Backend Endpoints

Reference from `INTER_AGENT_TOKEN_ECONOMY_SUMMARY.md`:

```
GET  /predictions/market/statistics
     Returns: market stats, total predictions, average accuracy, top performers

GET  /predictions/agent/:agentId
     Returns: agent-specific prediction performance and token earnings

POST /predictions/resolve/md-review
     Body: { consultationId, mdReviewData }
     Resolves predictions with MD review feedback

GET  /tokens/statistics
     Returns: token distribution, agent balances, network stats
```

### Current Database Schema

**consultations table** (existing):
- case_id (primary key)
- fid (user identifier)
- user_question
- claude_response
- raw_consultation_data (JSON with agent responses)
- confidence
- created_at
- is_private (added in Phase 2)

**milestone_feedback table** (added in Phase 2):
- id
- case_id
- milestone_week (2, 4, or 8)
- pain_level
- functional_status
- movement_quality
- created_at

**user_feedback table** (existing):
- case_id
- fid
- overall_stars
- concern_resolution
- specialist_ratings (JSON)
- most_valuable_aspects
- created_at

## Phase 3 Requirements

### Authentication & Access Control

**Admin Dashboard Access:**
- Route: `/admin/dashboard`
- Auth: Farcaster-gated to Keith's FID only
- Implementation: Check `session.fid === process.env.ADMIN_FID` in middleware

**MD Review Access:**
- Only Keith can submit MD reviews
- Same FID check as admin dashboard

### Alert System

**Queue Alert:**
- Trigger: When MD review queue exceeds 50 pending consultations
- Display: Red badge on dashboard with count
- Action: Prominent visual indicator to prompt daily review

**Implementation:**
```typescript
const queueCount = await db.query(`
  SELECT COUNT(*) as count 
  FROM consultations 
  WHERE md_reviewed = false 
    AND participating_specialists >= 4 
    AND consensus_percentage >= 0.80
`);

const showAlert = queueCount[0].count > 50;
```

### Data Retention

**Consultation Data:**
- Retention Period: 120 days (safely past 8-week follow-up window)
- Scope: Delete consultations older than 120 days
- Exceptions: Keep exceptional tier consultations (validated outcomes) indefinitely for training/research

**Implementation:**
```typescript
// Run daily via cron job or scheduled task
async function cleanupOldConsultations() {
  await db.query(`
    DELETE FROM consultations 
    WHERE created_at < NOW() - INTERVAL 120 DAY
      AND tier != 'exceptional'
  `);
  
  // Also cleanup related tables
  await db.query(`
    DELETE FROM milestone_feedback 
    WHERE case_id NOT IN (SELECT case_id FROM consultations)
  `);
}
```

### Export Functionality

**Current State:**
- Export button already exists in current dashboard
- Used for training data export (CSV/JSON)

**Phase 3 Update:**
- Keep existing export button
- Update to export new metrics (agent performance, card distribution, engagement)
- Format: CSV for spreadsheet analysis, JSON for backup

**Implementation:**
```typescript
// GET /api/admin/export
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'csv'; // csv or json
  const dataType = searchParams.get('type') || 'consultations'; // consultations, agents, engagement
  
  // Query appropriate data
  // Format as CSV or JSON
  // Return with proper headers for download
}
```

### Public Stats Page

**New Route:** `/stats`
- Public access (no auth required)
- Shows agent leaderboard, card distribution, network statistics
- Promotes transparency and builds trust
- Simplified version of admin dashboard

**What to Show Publicly:**
- Agent performance leaderboard (accuracy, tokens earned)
- Card tier distribution (% in each tier)
- Network statistics (total consultations, average consensus)
- Prediction accuracy trends

**What to Keep Private (Admin Only):**
- Individual user consultations
- MD review queue
- User engagement metrics (validation rates, return visits)
- Detailed agent calibration data

## Database Schema Updates for Phase 3

### New Columns for consultations table:

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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tier ON consultations(tier);
CREATE INDEX IF NOT EXISTS idx_md_reviewed ON consultations(md_reviewed);
CREATE INDEX IF NOT EXISTS idx_created_at ON consultations(created_at);
```

### New Tables:

```sql
-- Track tracking page views for return visit metrics
CREATE TABLE IF NOT EXISTS tracking_page_views (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) NOT NULL,
  fid VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_case_id (case_id),
  INDEX idx_created_at (created_at)
);

-- Track QR code scans for engagement metrics
CREATE TABLE IF NOT EXISTS qr_scans (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) NOT NULL,
  scanned_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_case_id (case_id),
  INDEX idx_scanned_at (scanned_at)
);
```

## Implementation Strategy

### Step 1: Database Migrations
First, update `lib/database.ts` to add the new columns and tables. Include a migration function that checks if columns/tables exist before creating them (safe for production).

### Step 2: Backend API Routes
Create 6 API routes in `app/api/admin/`:
1. `metrics/overview/route.ts` - Combines local DB + orthoiq-agents stats
2. `prediction-market/performance/route.ts` - Proxies to orthoiq-agents
3. `cards/distribution/route.ts` - Queries local consultations table
4. `engagement/metrics/route.ts` - Calculates validation funnel from milestone_feedback
5. `md-review/queue/route.ts` - Returns pending consultations
6. `md-review/route.ts` - Submits review and resolves predictions

### Step 3: Frontend Components
Build dashboard page at `app/admin/dashboard/page.tsx` with 7 sections:
1. SystemOverview
2. PredictionMarketAnalytics (agent leaderboard)
3. CardDistribution (tier breakdown)
4. EngagementMetrics (validation funnel)
5. MDReviewQueue (pending consultations)
6. AgentDetailView (click agent → details)
7. RecentActivityFeed (live stream)

### Step 4: Public Stats Page
Create simplified public version at `app/stats/page.tsx`:
- Agent leaderboard (top 5)
- Card tier distribution
- Network statistics
- Prediction accuracy trends
- No auth required, no user-specific data

### Step 5: Alert System
Add queue alert badge to dashboard header:
```tsx
{queueCount > 50 && (
  <div className="alert alert-warning">
    <span className="badge badge-error">{queueCount}</span>
    MD Review Queue Needs Attention
  </div>
)}
```

### Step 6: Data Cleanup
Add cron job or scheduled task for 120-day cleanup:
```typescript
// Can use Vercel Cron or similar
// Run daily at 2am
export const config = {
  schedule: '0 2 * * *' // Daily at 2am
};

export default async function handler() {
  await cleanupOldConsultations();
}
```

## Key Implementation Notes

### Error Handling
```typescript
// Always handle orthoiq-agents backend failures gracefully
try {
  const agentData = await fetch('http://localhost:3000/predictions/market/statistics')
    .then(r => r.json());
} catch (error) {
  console.error('orthoiq-agents backend unavailable:', error);
  // Return partial data from local DB only
  // Show warning in dashboard: "Agent statistics unavailable"
}
```

### Environment Variables
```env
# Add to .env.local
ADMIN_FID=your_farcaster_fid
ORTHOIQ_AGENTS_URL=http://localhost:3000  # or Railway URL in production
```

### Performance Considerations
- Cache expensive queries (agent stats, card distribution) for 30 seconds
- Use React Query or SWR for frontend data fetching with auto-refresh
- Add loading skeletons for better UX
- Paginate MD review queue if > 100 items

### Testing Checklist
After implementation, verify:
- [ ] Dashboard loads with combined data from both sources
- [ ] Agent leaderboard shows accurate stats from orthoiq-agents backend
- [ ] Card tier distribution calculates correctly from consultations table
- [ ] MD review queue filters pending consultations correctly (4+ specialists, 80%+ consensus)
- [ ] Submitting MD review calls backend and updates tier
- [ ] Queue alert appears when > 50 pending
- [ ] Public /stats page loads without auth
- [ ] Export button downloads new metrics

## Reference Documents

You have access to:
- `phase_3_admin_dashboard_spec.md` - Complete specification with layouts and metrics
- `INTER_AGENT_TOKEN_ECONOMY_SUMMARY.md` - Backend endpoints and token economics
- `OrthoIQ-Agents_Request_Pipeline___Data_Flow` - Backend response structure

## Ready to Start

You can now proceed with the 5 prompts in `phase_3_admin_dashboard_spec.md`:
1. Backend API Routes
2. Database Schema Updates
3. Dashboard Frontend Components
4. MD Review Interface
5. Agent Detail Page

Each prompt builds on the previous one. Start with Prompt 1 and work sequentially.

---

**Important:** After Phase 3 completion, Keith wants to add a public `/stats` page for transparency. This should be built as a simplified version of the admin dashboard with only public metrics (agent leaderboard, card distribution, network stats).
