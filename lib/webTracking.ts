import { createHash } from 'crypto';

export interface WebSession {
  sessionId: string;
  ipHash: string;
  questionsAsked: number;
  createdAt: Date;
}

export interface WebUsageResult {
  questionsAsked: number;
  questionsRemaining: number;
  isLimitReached: boolean;
}

/**
 * Generate a unique session ID for web users
 * Stored in localStorage for persistent tracking across page reloads
 */
export function generateSessionId(): string {
  // Check if session ID already exists in localStorage
  if (typeof window !== 'undefined') {
    const existingSessionId = localStorage.getItem('orthoiq_session_id');
    if (existingSessionId) {
      return existingSessionId;
    }
  }

  // Generate new session ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sessionId = `web_${timestamp}_${random}`;

  // Store in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('orthoiq_session_id', sessionId);
  }

  return sessionId;
}

/**
 * Hash IP address for privacy-preserving tracking
 * Uses SHA-256 to create a one-way hash
 */
export function hashIP(ip: string): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // Add a salt to make rainbow table attacks harder
  const salt = process.env.IP_HASH_SALT || 'orthoiq_default_salt_2024';
  const hash = createHash('sha256');
  hash.update(ip + salt);
  return hash.digest('hex');
}

/**
 * Get web session usage from API
 * @param isEmailVerified - Whether the user has verified their email (affects limit: 1 vs 10)
 */
export async function getWebSessionUsage(isEmailVerified: boolean = false): Promise<WebUsageResult> {
  // Default limit based on verification status
  const defaultLimit = isEmailVerified ? 10 : 1;

  try {
    const sessionId = generateSessionId();
    const response = await fetch('/api/web-limit', {
      method: 'GET',
      headers: {
        'x-session-id': sessionId,
        'x-email-verified': isEmailVerified ? 'true' : 'false'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch web usage:', response.statusText);
      return {
        questionsAsked: 0,
        questionsRemaining: defaultLimit,
        isLimitReached: false
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching web session usage:', error);
    return {
      questionsAsked: 0,
      questionsRemaining: defaultLimit,
      isLimitReached: false
    };
  }
}

/**
 * Clear session ID (useful for testing or logout)
 */
export function clearSessionId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('orthoiq_session_id');
  }
}

/**
 * Get current session ID without generating a new one
 */
export function getSessionId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('orthoiq_session_id');
  }
  return null;
}
