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
