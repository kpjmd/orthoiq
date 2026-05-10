/**
 * Centralised fetch helper for all server-side calls to the orthoiq-agents backend.
 *
 * Every protected route now requires X-API-Key (Phase 1 audit).
 * Three keys are recognised by the backend (src/middleware/auth.js):
 *   web      → regular user-facing routes
 *   farcaster → miniapp routes (also forwards Authorization: Bearer <jwt>)
 *   admin    → /predictions/resolve/md-review and admin-only routes
 *
 * Recovery routes additionally need X-User-Id or Authorization forwarded;
 * pass jwt/webUserId when calling those paths.
 */

type CallerKey = 'web' | 'farcaster' | 'admin';

function getApiKey(caller: CallerKey): string | undefined {
  switch (caller) {
    case 'web':       return process.env.ORTHOIQ_AGENTS_WEB_KEY;
    case 'farcaster': return process.env.ORTHOIQ_AGENTS_FARCASTER_KEY;
    case 'admin':     return process.env.ORTHOIQ_AGENTS_ADMIN_KEY;
  }
}

export interface AgentsFetchInit extends Omit<RequestInit, 'headers'> {
  caller: CallerKey;
  /** Farcaster JWT — forwarded as Authorization: Bearer <jwt> */
  jwt?: string;
  /** web:<uuid> — forwarded as X-User-Id (required for /recovery/* with web caller) */
  webUserId?: string;
}

/**
 * Drop-in fetch wrapper that injects the correct X-API-Key (and optional
 * identity headers) for every call to the orthoiq-agents backend.
 *
 * @param path  Must start with "/" e.g. "/consultation"
 */
export function agentsFetch(path: string, { caller, jwt, webUserId, ...rest }: AgentsFetchInit): Promise<Response> {
  const base = process.env.ORTHOIQ_AGENTS_URL ?? 'http://localhost:3000';
  const apiKey = getApiKey(caller);

  if (!apiKey) {
    console.warn(`[agentsClient] ORTHOIQ_AGENTS_${caller.toUpperCase()}_KEY is not set — backend will reject with 401`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey     && { 'X-API-Key': apiKey }),
    ...(jwt        && { Authorization: `Bearer ${jwt}` }),
    ...(webUserId  && { 'X-User-Id': webUserId }),
  };

  return fetch(`${base}${path}`, { headers, ...rest });
}
