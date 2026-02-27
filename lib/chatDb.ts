import { getSql } from './database';

// ── Post-consultation chatbot functions (Phase 3.2) ──
// Extracted from database.ts to keep that file within build-tooling size limits.

export async function storeChatMessage({
  consultationId,
  fid,
  role,
  content,
  specialistContext = 'triage',
}: {
  consultationId: string;
  fid: string;
  role: 'user' | 'assistant';
  content: string;
  specialistContext?: string;
}): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      INSERT INTO chat_messages (consultation_id, fid, role, content, specialist_context)
      VALUES (${consultationId}, ${fid}, ${role}, ${content}, ${specialistContext})
      RETURNING id
    `;
    return result[0].id;
  } catch (error) {
    console.error('Error storing chat message:', error);
    throw error;
  }
}

export async function getChatHistory(consultationId: string): Promise<Array<{ id: number; role: string; content: string; created_at: string }>> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT id, role, content, created_at
      FROM chat_messages
      WHERE consultation_id = ${consultationId}
      ORDER BY created_at ASC
    `;
    return result as Array<{ id: number; role: string; content: string; created_at: string }>;
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
}

export async function getChatMessageCount(consultationId: string): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE consultation_id = ${consultationId} AND role = 'user'
    `;
    return parseInt(result[0].count, 10);
  } catch (error) {
    console.error('Error getting chat message count:', error);
    throw error;
  }
}
