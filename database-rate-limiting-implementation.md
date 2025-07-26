# Database-Based Rate Limiting Implementation

## ✅ Problem Solved

**Issue**: Question count wasn't decreasing because the in-memory Map was resetting with each serverless function cold start.

**Solution**: Implemented database-based rate limiting that persists across serverless function invocations.

## 🔧 Changes Made

### 1. **Enhanced Database Functions** (`lib/database.ts`)

Added two new functions:

- **`checkRateLimitDBWithTiers(fid, tier)`**: 
  - Queries the questions table for count in last 24 hours
  - Supports all user tiers (basic: 1, authenticated: 3, medical: 10)
  - Returns allowed status, remaining count, and reset time
  - Works per individual FID

- **`getRateLimitStatusDB(fid, tier)`**:
  - Gets current question count without incrementing
  - Same format as in-memory version for compatibility
  - Used by frontend to display remaining questions

### 2. **Updated API Routes**

- **`/api/claude`**: Now uses `checkRateLimitDBWithTiers` instead of in-memory `checkRateLimit`
- **`/api/rate-limit-status`**: Now uses `getRateLimitStatusDB` for consistent database queries

### 3. **Database Query Logic**

Both functions use the same SQL query:
```sql
SELECT COUNT(*) as count FROM questions 
WHERE fid = ${fid} AND created_at > ${oneDayAgo.toISOString()}
```

This counts all questions submitted by a specific FID in the last 24 hours.

## 🎯 Expected Results

### Before (Broken):
- Question count always showed max (3/3 or 1/1)
- Users could submit unlimited questions
- Rate limits never enforced due to serverless resets

### After (Fixed):
- Question count decreases properly after each submission
- Each user tracked individually by their Farcaster FID  
- Rate limits enforced across serverless function invocations
- Database persistence ensures accuracy

## 🧪 Testing Scenarios

### Basic User (Tier: basic, Limit: 1)
1. Load mini app → shows "1 of 1" questions remaining
2. Submit question → count decreases to "0 of 1"
3. Try second question → blocked with "Daily limit reached!" message
4. Message encourages signing in for more questions

### Authenticated User (Tier: authenticated, Limit: 3)
1. Sign in with Farcaster → shows "3 of 3" questions remaining
2. Submit question → count decreases to "2 of 3"
3. Submit second question → count decreases to "1 of 3"
4. Submit third question → count decreases to "0 of 3"
5. Try fourth question → blocked with reset timer

### Multi-User Testing
- Each FID gets their own independent rate limit
- User A can't exhaust User B's questions
- Database queries are scoped by FID

## 🔄 Benefits

1. **Persistent Storage**: Rate limits survive serverless cold starts
2. **Individual Tracking**: Each user gets their own question count
3. **Accurate Counting**: Database ensures consistency
4. **Production Ready**: Works on Vercel and other serverless platforms
5. **Fallback Safety**: Defaults to allowing questions on database errors

## 📊 Database Impact

- Queries the existing `questions` table
- No schema changes required
- Uses existing `fid` and `created_at` columns
- Consider adding index on `(fid, created_at)` for performance if needed

The implementation now provides reliable, persistent rate limiting that will correctly decrease question counts for each individual user.