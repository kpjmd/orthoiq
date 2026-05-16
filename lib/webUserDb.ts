import { getSql, WebUser } from './database';
import { normalizeAddress } from './walletSiwe';

export type WalletChallengePurpose = 'connect' | 'verify' | 'backfill';

export interface WalletChallengeRow {
  id: string;
  nonce: string;
  wallet_address: string;
  web_user_id: string | null;
  purpose: WalletChallengePurpose;
  message: string;
  issued_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

export async function consumeWalletChallenge(
  nonce: string
): Promise<WalletChallengeRow | null> {
  const sql = getSql();

  // Atomic check-and-consume: only the first caller wins.
  const rows = await sql`
    UPDATE wallet_challenges
    SET consumed_at = CURRENT_TIMESTAMP
    WHERE nonce = ${nonce}
      AND consumed_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    RETURNING *
  `;

  if (rows.length === 0) return null;
  return rows[0] as WalletChallengeRow;
}

export async function getWebUserByWallet(address: string): Promise<WebUser | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM web_users
    WHERE LOWER(wallet_address) = LOWER(${address})
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as WebUser) : null;
}

export async function getOrCreateWalletWebUser(address: string): Promise<WebUser> {
  const sql = getSql();
  const normalized = normalizeAddress(address);

  // Try a read first (the common case for returning users).
  const existing = await sql`
    SELECT * FROM web_users
    WHERE LOWER(wallet_address) = LOWER(${normalized})
    LIMIT 1
  `;
  if (existing.length > 0) {
    await sql`UPDATE web_users SET last_login = CURRENT_TIMESTAMP WHERE id = ${existing[0].id}`;
    return existing[0] as WebUser;
  }

  // Race-safe insert: if another tab beat us to it, retry the read.
  try {
    const inserted = await sql`
      INSERT INTO web_users (wallet_address, email_verified, wallet_verified_at, last_login)
      VALUES (${normalized}, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    return inserted[0] as WebUser;
  } catch (err: any) {
    if (err?.code !== '23505') throw err;
    const retry = await sql`
      SELECT * FROM web_users WHERE LOWER(wallet_address) = LOWER(${normalized}) LIMIT 1
    `;
    if (retry.length === 0) throw err;
    await sql`UPDATE web_users SET last_login = CURRENT_TIMESTAMP WHERE id = ${retry[0].id}`;
    return retry[0] as WebUser;
  }
}

export interface AttachWalletResult {
  status: 'attached' | 'merged' | 'conflict';
  /** Present when status='merged' — the loser id that was merged into the session user */
  mergedFromId?: string;
  /** Present when status='conflict' — the other web_users.id that already owns this wallet */
  conflictingWebUserId?: string;
}

/**
 * Attach a verified wallet to a web user. If another wallet-only row already owns it,
 * merge that row into this one. If another row WITH an email already owns it, reject.
 */
export async function attachWalletToWebUser(
  webUserId: string,
  address: string
): Promise<AttachWalletResult> {
  const sql = getSql();
  const normalized = normalizeAddress(address);

  // Step 1: see if someone else holds it
  const existing = await sql`
    SELECT id, email FROM web_users
    WHERE LOWER(wallet_address) = LOWER(${normalized})
      AND id != ${webUserId}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const otherRow = existing[0];
    if (otherRow.email != null) {
      return { status: 'conflict', conflictingWebUserId: otherRow.id };
    }
    // Wallet-only row → merge it into webUserId
    await mergeWebUsers(otherRow.id, webUserId);
    // Now safe to set the wallet on our user
    await sql`
      UPDATE web_users
      SET wallet_address = ${normalized}, wallet_verified_at = CURRENT_TIMESTAMP
      WHERE id = ${webUserId}
    `;
    return { status: 'merged', mergedFromId: otherRow.id };
  }

  await sql`
    UPDATE web_users
    SET wallet_address = ${normalized}, wallet_verified_at = CURRENT_TIMESTAMP
    WHERE id = ${webUserId}
  `;
  return { status: 'attached' };
}

/**
 * Re-point all FKs from loserId to winnerId, then delete the loser row.
 * Used when merging a wallet-only web_users row into a session user's row.
 */
export async function mergeWebUsers(loserId: string, winnerId: string): Promise<void> {
  const sql = getSql();

  await sql`UPDATE consultations SET web_user_id = ${winnerId} WHERE web_user_id = ${loserId}`;
  await sql`UPDATE questions SET web_user_id = ${winnerId} WHERE web_user_id = ${loserId}`;
  await sql`UPDATE feedback_milestones SET web_user_id = ${winnerId} WHERE web_user_id = ${loserId}`;
  await sql`UPDATE promis_responses SET web_user_id = ${winnerId} WHERE web_user_id = ${loserId}`;
  // wallet_challenges has ON DELETE CASCADE — the DELETE below removes them.
  await sql`DELETE FROM web_sessions WHERE web_user_id = ${loserId}`;
  await sql`DELETE FROM web_users WHERE id = ${loserId}`;
}

/**
 * Attach all orphaned consultations (web_user_id IS NULL) for this wallet
 * to the given web_user_id. Also backfills promis_responses for those consultations.
 * Returns the number of consultations updated.
 */
export async function backfillConsultationsForWallet(
  webUserId: string,
  address: string
): Promise<number> {
  const sql = getSql();
  const normalized = normalizeAddress(address);

  const updated = await sql`
    UPDATE consultations
    SET web_user_id = ${webUserId}
    WHERE LOWER(wallet_address) = LOWER(${normalized})
      AND web_user_id IS NULL
    RETURNING consultation_id
  `;

  if (updated.length > 0) {
    // Cascade web_user_id to the matching promis_responses rows
    await sql`
      UPDATE promis_responses pr
      SET web_user_id = ${webUserId}
      FROM consultations c
      WHERE pr.consultation_id = c.consultation_id
        AND c.web_user_id = ${webUserId}
        AND pr.web_user_id IS NULL
    `;
  }

  return updated.length;
}
