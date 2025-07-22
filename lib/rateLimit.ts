// Simple in-memory rate limiting for development
// In production, use Redis or database

interface RateLimitEntry {
  count: number;
  resetTime: Date;
}

// In-memory storage (will reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

const QUESTIONS_PER_DAY = 1;
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RateLimitResult {
  allowed: boolean;
  resetTime?: Date;
  remaining?: number;
}

export async function checkRateLimit(fid: string): Promise<RateLimitResult> {
  const now = new Date();
  const key = `rate_limit:${fid}`;
  
  // Get existing entry
  let entry = rateLimitStore.get(key);
  
  // If no entry exists or reset time has passed, create/reset entry
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: new Date(now.getTime() + RESET_INTERVAL_MS)
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if limit exceeded
  if (entry.count >= QUESTIONS_PER_DAY) {
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0
    };
  }
  
  // Increment count and allow request
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: QUESTIONS_PER_DAY - entry.count
  };
}

export async function getRateLimitStatus(fid: string): Promise<RateLimitResult> {
  const now = new Date();
  const key = `rate_limit:${fid}`;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now >= entry.resetTime) {
    return {
      allowed: true,
      remaining: QUESTIONS_PER_DAY
    };
  }
  
  return {
    allowed: entry.count < QUESTIONS_PER_DAY,
    resetTime: entry.resetTime,
    remaining: Math.max(0, QUESTIONS_PER_DAY - entry.count)
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = new Date();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour