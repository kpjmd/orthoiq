# Database Setup Guide for OrthoIQ

## Current Setup: Neon Database

This application now uses **Neon** serverless PostgreSQL database with the `@neondatabase/serverless` client library.

### Why We Switched to Neon

Previously, we had issues with:
- `Error: Unexpected server response: 404` 
- Connection attempts to `wss://db.prisma.io/v2`
- `FUNCTION_INVOCATION_TIMEOUT` errors

These occurred because we were using Prisma Postgres (which requires Prisma Client) with the `@vercel/postgres` library.

### Current Configuration

#### Database Client
- **Library**: `@neondatabase/serverless`
- **Benefits**: 
  - Optimized for serverless environments
  - Sub-1 second cold starts
  - Scale-to-zero capabilities
  - No WebSocket proxy issues

#### Environment Variables

**In Vercel Dashboard:**
```
DATABASE_URL=your_neon_database_connection_string_here
```

**In Local Development (.env.local):**
```env
DATABASE_URL=your_neon_database_connection_string_here
```

> ⚠️ **Security Note**: Never commit actual database credentials to version control. Use environment variables and keep your `.env.local` file gitignored.

### Database Features

#### Tables Created Automatically
- `questions` - Stores Q&A interactions with FID, question, response, confidence
- `rate_limits` - Stores rate limiting data per user

#### Neon Benefits
- **Database Branching**: Create instant copies for development/staging
- **Serverless**: Automatic scaling and suspension
- **Connection Pooling**: Uses `-pooler` endpoint for optimal performance
- **No Connection Limits**: Perfect for serverless functions

### Verifying the Setup

1. Check health endpoint: `https://your-app.vercel.app/api/health`
2. Database health: `https://your-app.vercel.app/api/health/database`
3. All checks should show as "healthy"

### Migration Complete

✅ **What was changed:**
- Replaced `@vercel/postgres` with `@neondatabase/serverless`
- Updated all database connection code to use Neon's SQL client
- Removed connection/disconnection management (handled automatically)
- Updated all health check endpoints

✅ **What works now:**
- No timeout errors
- Instant database connections
- Proper error handling
- All existing functionality maintained

### Notes

- Neon connections are stateless - no need to manage connections
- The `-pooler` endpoint provides connection pooling automatically
- Scale-to-zero means no database costs when idle
- Perfect for Vercel serverless deployments