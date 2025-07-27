import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check critical environment variables for Mini App
    const requiredEnvVars = [
      'NEXT_PUBLIC_HOST',
      'DATABASE_URL',
      'ANTHROPIC_API_KEY',
      'ADMIN_PASSWORD_HASH',
      'ADMIN_API_KEY'
    ];

    // Check Farcaster-specific environment variables
    const farcasterEnvVars = [
      'NEYNAR_API_KEY',
      'FARCASTER_HUB_URL'
    ];

    const missingVars: string[] = [];
    const presentVars: string[] = [];

    requiredEnvVars.forEach(varName => {
      if (process.env[varName]) {
        presentVars.push(varName);
      } else {
        missingVars.push(varName);
      }
    });

    const missingFarcasterVars: string[] = [];
    const presentFarcasterVars: string[] = [];

    farcasterEnvVars.forEach(varName => {
      if (process.env[varName]) {
        presentFarcasterVars.push(varName);
      } else {
        missingFarcasterVars.push(varName);
      }
    });

    // Check optional Neon Auth variables
    const optionalVars = [
      'NEXT_PUBLIC_STACK_PROJECT_ID',
      'NEXT_PUBLIC_PUBLISHABLE_CLIENT_KEY', 
      'STACK_SECRET_SERVER_KEY'
    ];

    const optionalStatus: Record<string, boolean> = {};
    optionalVars.forEach(varName => {
      optionalStatus[varName] = !!process.env[varName];
    });

    const isHealthy = missingVars.length === 0;
    const hasWarnings = missingFarcasterVars.length > 0;

    const status = {
      status: !isHealthy ? 'missing_env_vars' : hasWarnings ? 'warnings' : 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        required: {
          present: presentVars,
          missing: missingVars
        },
        farcaster: {
          present: presentFarcasterVars,
          missing: missingFarcasterVars
        },
        optional: optionalStatus
      },
      host: process.env.NEXT_PUBLIC_HOST,
      isProduction: process.env.NODE_ENV === 'production',
      warnings: hasWarnings ? ['Some Farcaster environment variables are missing - webhook functionality may be limited'] : []
    };

    return NextResponse.json(status, {
      status: missingVars.length === 0 ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}