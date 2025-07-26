import { NextResponse } from 'next/server';

export async function GET() {
  // Debug endpoint to check environment variables
  return NextResponse.json({
    hasAdminPassword: !!process.env.ADMIN_PASSWORD,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasNextPublicDomain: !!process.env.NEXT_PUBLIC_DOMAIN,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}