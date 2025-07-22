# Database Setup Guide for OrthoIQ

## Important: Database Configuration

This application uses `@vercel/postgres` client library which requires a standard PostgreSQL connection string.

### Current Issue
If you're seeing errors like:
- `Error: Unexpected server response: 404` 
- Connection attempts to `wss://db.prisma.io/v2`
- `FUNCTION_INVOCATION_TIMEOUT` errors

This is because the application is trying to use Prisma Postgres with the Vercel Postgres client library.

### Solution

You have **Prisma Postgres** installed with these environment variables:
- `POSTGRES_URL` - Standard PostgreSQL connection
- `PRISMA_DATABASE_URL` - Prisma Accelerate connection (not compatible with @vercel/postgres)

#### In Vercel Dashboard:

1. Go to your project settings → Environment Variables
2. Update the `DATABASE_URL` variable to use the same value as `POSTGRES_URL`:
   ```
   DATABASE_URL="postgres://[your-connection-string]@db.prisma.io:5432/?sslmode=require"
   ```
3. This should be the standard PostgreSQL connection string, NOT the Prisma Accelerate URL

#### In Local Development:

Update your `.env.local` file:
```env
DATABASE_URL=postgres://[your-connection-string]@db.prisma.io:5432/?sslmode=require
```

### Alternative: Switch to Prisma Client

If you want to use Prisma's advanced features (like connection pooling via Accelerate), you would need to:
1. Install Prisma dependencies
2. Set up Prisma schema
3. Replace `@vercel/postgres` with Prisma Client throughout the codebase
4. Use `PRISMA_DATABASE_URL` for the connection

### Verifying the Setup

After updating the DATABASE_URL:

1. Redeploy your application on Vercel
2. Check the health endpoint: `https://your-app.vercel.app/api/health`
3. The database check should show as "healthy"

### Notes

- The WebSocket error to `db.prisma.io` happens because Prisma Accelerate uses a proxy that requires Prisma Client
- `@vercel/postgres` expects a direct PostgreSQL connection, not a Prisma proxy
- Both Vercel Postgres and Prisma Postgres are PostgreSQL databases, but they use different connection methods