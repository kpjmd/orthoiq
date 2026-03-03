import { getSql } from './database';

// ── PROMIS Response Functions (Phase 3.3) ──
// Extracted from database.ts to keep that file within build-tooling size limits.

export async function storePromisResponse(data: {
  consultationId: string;
  patientId: string;
  timepoint: string;
  physicalFunctionResponses: Record<string, number>;
  physicalFunctionRawScore: number;
  physicalFunctionTScore: number;
  painInterferenceResponses?: Record<string, number> | null;
  painInterferenceRawScore?: number | null;
  painInterferenceTScore?: number | null;
}): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      INSERT INTO promis_responses (
        consultation_id, patient_id, timepoint,
        physical_function_responses, physical_function_raw_score, physical_function_t_score,
        pain_interference_responses, pain_interference_raw_score, pain_interference_t_score
      ) VALUES (
        ${data.consultationId}, ${data.patientId}, ${data.timepoint},
        ${JSON.stringify(data.physicalFunctionResponses)}, ${data.physicalFunctionRawScore}, ${data.physicalFunctionTScore},
        ${data.painInterferenceResponses ? JSON.stringify(data.painInterferenceResponses) : null},
        ${data.painInterferenceRawScore ?? null},
        ${data.painInterferenceTScore ?? null}
      )
      ON CONFLICT (consultation_id, timepoint) DO UPDATE SET
        physical_function_responses = EXCLUDED.physical_function_responses,
        physical_function_raw_score = EXCLUDED.physical_function_raw_score,
        physical_function_t_score = EXCLUDED.physical_function_t_score,
        pain_interference_responses = EXCLUDED.pain_interference_responses,
        pain_interference_raw_score = EXCLUDED.pain_interference_raw_score,
        pain_interference_t_score = EXCLUDED.pain_interference_t_score
      RETURNING id
    `;
    console.log('PROMIS response stored:', { consultationId: data.consultationId, timepoint: data.timepoint });
    return result[0].id;
  } catch (error) {
    console.error('Error storing PROMIS response:', error);
    throw error;
  }
}

export async function getPromisResponses(consultationId: string): Promise<any[]> {
  const sql = getSql();

  try {
    const rows = await sql`
      SELECT * FROM promis_responses
      WHERE consultation_id = ${consultationId}
      ORDER BY created_at ASC
    `;
    return rows;
  } catch (error) {
    console.error('Error getting PROMIS responses:', error);
    throw error;
  }
}

export async function getPromisBaseline(consultationId: string): Promise<any | null> {
  const sql = getSql();

  try {
    const rows = await sql`
      SELECT * FROM promis_responses
      WHERE consultation_id = ${consultationId} AND timepoint = 'baseline'
      LIMIT 1
    `;
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting PROMIS baseline:', error);
    throw error;
  }
}

// ── User Profile Functions ──

export async function upsertUserProfile(data: {
  fid: string;
  walletAddress?: string | null;
  displayName?: string | null;
  username?: string | null;
  pfpUrl?: string | null;
}): Promise<void> {
  const sql = getSql();

  try {
    await sql`
      INSERT INTO user_profiles (fid, wallet_address, display_name, username, pfp_url, last_seen)
      VALUES (
        ${data.fid},
        ${data.walletAddress ?? null},
        ${data.displayName ?? null},
        ${data.username ?? null},
        ${data.pfpUrl ?? null},
        NOW()
      )
      ON CONFLICT (fid) DO UPDATE SET
        wallet_address = COALESCE(EXCLUDED.wallet_address, user_profiles.wallet_address),
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        username = COALESCE(EXCLUDED.username, user_profiles.username),
        pfp_url = COALESCE(EXCLUDED.pfp_url, user_profiles.pfp_url),
        last_seen = NOW()
    `;
  } catch (error) {
    console.error('Error upserting user profile:', error);
    throw error;
  }
}

export async function getUserProfile(fid: string): Promise<any | null> {
  const sql = getSql();

  try {
    const rows = await sql`
      SELECT * FROM user_profiles WHERE fid = ${fid} LIMIT 1
    `;
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function getUserPromisHistory(fid: string): Promise<any[]> {
  const sql = getSql();

  try {
    const rows = await sql`
      SELECT
        pr.consultation_id,
        pr.timepoint,
        pr.physical_function_t_score,
        pr.pain_interference_t_score,
        pr.created_at AS response_date,
        c.created_at AS consultation_date,
        q.question AS consultation_question
      FROM promis_responses pr
      JOIN consultations c ON pr.consultation_id = c.consultation_id
      JOIN questions q ON c.question_id = q.id
      WHERE pr.patient_id = ${fid}
      ORDER BY c.created_at DESC, pr.timepoint ASC
    `;
    return rows;
  } catch (error) {
    console.error('Error getting user PROMIS history:', error);
    return [];
  }
}
