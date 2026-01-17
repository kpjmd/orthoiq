// Rate limiting with platform-aware limits and soft notifications
// Miniapp users: UNLIMITED (all Farcaster authenticated)
// Web verified users: 10/day
// Web unverified users: 1/day

import {
  getWebRateLimit,
  incrementWebRateLimit,
  checkWebRateLimitStatus
} from './database';

interface RateLimitEntry {
  count: number;
  resetTime: Date;
  tier: UserTier;
  platform?: 'miniapp' | 'web';
  mode?: 'fast' | 'comprehensive';
}

// In-memory storage for legacy rate limiting (miniapp backward compatibility)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Note: Web rate limits are now stored in the database (survives server restarts)

export type UserTier = 'basic' | 'authenticated' | 'medical';
export type Platform = 'miniapp' | 'web';
export type ConsultationMode = 'fast' | 'comprehensive';

// Web limits (daily)
const WEB_VERIFIED_DAILY_LIMIT = 10;   // Verified email users: 10/day
const WEB_UNVERIFIED_DAILY_LIMIT = 1;  // Unverified users: 1/day

// Legacy tier limits (for backward compatibility)
const TIER_LIMITS: Record<UserTier, number> = {
  basic: 1,
  authenticated: 3,
  medical: 10
};

const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RateLimitResult {
  allowed: boolean;
  resetTime?: Date;
  remaining?: number;
  total?: number;
  tier?: UserTier;
  platform?: Platform;
  mode?: ConsultationMode;
  isVerified?: boolean;
  // Soft notification fields
  softWarning?: string;
  upgradePrompt?: string;
}

// New platform-aware rate limiting with email verification support
export async function checkPlatformRateLimit(
  identifier: string, // FID for miniapp, web_user_id or IP for web
  platform: Platform,
  mode: ConsultationMode = 'fast',
  tier: UserTier = 'authenticated',
  isEmailVerified: boolean = false // NEW: Check if web user has verified email
): Promise<RateLimitResult> {
  // Miniapp users (all Farcaster authenticated): UNLIMITED
  if (platform === 'miniapp') {
    return {
      allowed: true,
      remaining: Infinity,
      total: Infinity,
      platform: 'miniapp',
      mode
    };
  }

  // Web users: Check verification status
  return checkWebRateLimitWithVerification(identifier, isEmailVerified);
}

// Web rate limiting based on email verification status (DATABASE-BACKED)
async function checkWebRateLimitWithVerification(
  identifier: string,
  isVerified: boolean
): Promise<RateLimitResult> {
  const dailyLimit = isVerified ? WEB_VERIFIED_DAILY_LIMIT : WEB_UNVERIFIED_DAILY_LIMIT;

  // Get current rate limit from database
  const currentEntry = await getWebRateLimit(identifier);
  const currentCount = currentEntry?.count ?? 0;

  // Check if limit exceeded BEFORE incrementing
  if (currentCount >= dailyLimit) {
    // Soft notification messages
    let softWarning: string;
    let upgradePrompt: string | undefined;

    if (!isVerified) {
      softWarning = "You've used your free question for today.";
      upgradePrompt = "Verify your email to unlock 10 questions per day!";
    } else {
      softWarning = "You've reached today's limit of 10 questions.";
      upgradePrompt = "Try OrthoIQ on Farcaster for unlimited consultations!";
    }

    return {
      allowed: false,
      resetTime: currentEntry?.reset_time,
      remaining: 0,
      total: dailyLimit,
      platform: 'web',
      isVerified,
      softWarning,
      upgradePrompt
    };
  }

  // Increment count in database and allow request
  const updatedEntry = await incrementWebRateLimit(identifier, isVerified);
  const remaining = dailyLimit - updatedEntry.count;

  // Near limit warning
  let softWarning: string | undefined;
  if (remaining <= 2 && remaining > 0) {
    softWarning = `${remaining} question${remaining === 1 ? '' : 's'} remaining today.`;
  }

  return {
    allowed: true,
    resetTime: updatedEntry.reset_time,
    remaining,
    total: dailyLimit,
    platform: 'web',
    isVerified,
    softWarning
  };
}

// Get rate limit status without incrementing (DATABASE-BACKED)
export async function getPlatformRateLimitStatus(
  identifier: string,
  platform: Platform,
  mode: ConsultationMode = 'fast',
  tier: UserTier = 'authenticated',
  isEmailVerified: boolean = false
): Promise<RateLimitResult> {
  // Miniapp: Always unlimited
  if (platform === 'miniapp') {
    return {
      allowed: true,
      remaining: Infinity,
      total: Infinity,
      platform: 'miniapp',
      mode
    };
  }

  // Web: Check status from database without incrementing
  const dailyLimit = isEmailVerified ? WEB_VERIFIED_DAILY_LIMIT : WEB_UNVERIFIED_DAILY_LIMIT;
  const dbStatus = await checkWebRateLimitStatus(identifier, isEmailVerified);

  const remaining = Math.max(0, dailyLimit - dbStatus.count);

  return {
    allowed: remaining > 0,
    resetTime: dbStatus.resetTime ?? undefined,
    remaining,
    total: dailyLimit,
    platform: 'web',
    isVerified: isEmailVerified,
    softWarning: remaining === 0
      ? (isEmailVerified
          ? "You've reached today's limit."
          : "You've used your free question for today.")
      : undefined,
    upgradePrompt: remaining === 0 && !isEmailVerified
      ? "Verify your email to unlock 10 questions per day!"
      : undefined
  };
}

// Legacy function for backward compatibility
export async function checkRateLimit(fid: string, tier: UserTier = 'basic'): Promise<RateLimitResult> {
  const now = new Date();
  const key = `rate_limit:${fid}`;
  const dailyLimit = TIER_LIMITS[tier];

  // Get existing entry
  let entry = rateLimitStore.get(key);

  // If no entry exists or reset time has passed, create/reset entry
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: new Date(now.getTime() + RESET_INTERVAL_MS),
      tier
    };
    rateLimitStore.set(key, entry);
  } else if (entry.tier !== tier) {
    // Update tier if it has changed (user signed in/out)
    entry.tier = tier;
    rateLimitStore.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= dailyLimit) {
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0,
      total: dailyLimit,
      tier
    };
  }

  // Increment count and allow request
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: dailyLimit - entry.count,
    total: dailyLimit,
    tier
  };
}

export async function getRateLimitStatus(fid: string, tier: UserTier = 'basic'): Promise<RateLimitResult> {
  const now = new Date();
  const key = `rate_limit:${fid}`;
  const dailyLimit = TIER_LIMITS[tier];

  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetTime) {
    return {
      allowed: true,
      remaining: dailyLimit,
      total: dailyLimit,
      tier
    };
  }

  return {
    allowed: entry.count < dailyLimit,
    resetTime: entry.resetTime,
    remaining: Math.max(0, dailyLimit - entry.count),
    total: dailyLimit,
    tier: entry.tier
  };
}

// IP-based rate limiting for additional security
const ipRateLimitStore = new Map<string, { count: number; resetTime: Date }>();
const IP_RATE_LIMIT = 100; // requests per hour per IP
const IP_RESET_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function checkIPRateLimit(ip: string): Promise<RateLimitResult> {
  const now = new Date();
  const key = `ip_rate_limit:${ip}`;

  // Get existing entry
  let entry = ipRateLimitStore.get(key);

  // If no entry exists or reset time has passed, create/reset entry
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: new Date(now.getTime() + IP_RESET_INTERVAL_MS)
    };
    ipRateLimitStore.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= IP_RATE_LIMIT) {
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0,
      total: IP_RATE_LIMIT
    };
  }

  // Increment count and allow request
  entry.count++;
  ipRateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: IP_RATE_LIMIT - entry.count,
    total: IP_RATE_LIMIT
  };
}

// Clean up expired entries periodically
// Note: Web rate limits are now cleaned up via database (see cleanupExpiredRateLimits in database.ts)
setInterval(() => {
  const now = new Date();

  // Clean up user rate limits (legacy in-memory for miniapp backward compatibility)
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }

  // Clean up IP rate limits
  for (const [key, entry] of ipRateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      ipRateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour
