// Simple in-memory rate limiting for development
// In production, use Redis or database

interface RateLimitEntry {
  count: number;
  resetTime: Date;
  tier: UserTier;
}

// In-memory storage (will reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

export type UserTier = 'basic' | 'authenticated' | 'medical';

// Question limits per tier per day
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
}

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
setInterval(() => {
  const now = new Date();
  
  // Clean up user rate limits
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