import { sql } from '@vercel/postgres';
import { Question } from './types';

// Database initialization - creates tables if they don't exist
export async function initDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        fid VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        response TEXT NOT NULL,
        is_filtered BOOLEAN DEFAULT FALSE,
        confidence REAL DEFAULT 0.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_questions_fid ON questions(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        fid VARCHAR(255) PRIMARY KEY,
        count INTEGER DEFAULT 0,
        reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Log a question and response interaction
export async function logInteraction(
  fid: string, 
  question: string, 
  response: string, 
  isFiltered: boolean = false,
  confidence: number = 0.0
): Promise<void> {
  try {
    await sql`
      INSERT INTO questions (fid, question, response, is_filtered, confidence)
      VALUES (${fid}, ${question}, ${response}, ${isFiltered}, ${confidence})
    `;
  } catch (error) {
    console.error('Error logging interaction:', error);
    throw error;
  }
}

// Get interaction history for a user
export async function getUserHistory(fid: string, limit: number = 10): Promise<Question[]> {
  try {
    const result = await sql`
      SELECT id, fid, question, response, is_filtered as "isFiltered", 
             confidence, created_at as timestamp
      FROM questions 
      WHERE fid = ${fid}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;

    return result.rows.map(row => ({
      id: row.id.toString(),
      fid: row.fid,
      question: row.question,
      response: row.response,
      isFiltered: row.isFiltered,
      timestamp: new Date(row.timestamp)
    }));
  } catch (error) {
    console.error('Error getting user history:', error);
    return [];
  }
}

// Get analytics data
export async function getAnalytics() {
  try {
    const totalQuestions = await sql`
      SELECT COUNT(*) as count FROM questions
    `;

    const uniqueUsers = await sql`
      SELECT COUNT(DISTINCT fid) as count FROM questions
    `;

    const questionsToday = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE created_at >= CURRENT_DATE
    `;

    const avgConfidence = await sql`
      SELECT AVG(confidence) as avg_confidence FROM questions 
      WHERE confidence > 0
    `;

    const filteredQuestions = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE is_filtered = true
    `;

    return {
      totalQuestions: parseInt(totalQuestions.rows[0].count),
      uniqueUsers: parseInt(uniqueUsers.rows[0].count),
      questionsToday: parseInt(questionsToday.rows[0].count),
      avgConfidence: parseFloat(avgConfidence.rows[0].avg_confidence) || 0,
      filteredQuestions: parseInt(filteredQuestions.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting analytics:', error);
    return {
      totalQuestions: 0,
      uniqueUsers: 0,
      questionsToday: 0,
      avgConfidence: 0,
      filteredQuestions: 0
    };
  }
}

// Database-backed rate limiting (alternative to in-memory)
export async function checkRateLimitDB(fid: string): Promise<{allowed: boolean, resetTime?: Date}> {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check recent questions count
    const recentQuestions = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE fid = ${fid} AND created_at > ${oneDayAgo.toISOString()}
    `;

    const count = parseInt(recentQuestions.rows[0].count);
    const allowed = count < 1; // 1 question per day

    return {
      allowed,
      resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Default to allowing on error
    return { allowed: true };
  }
}

// Clean up old data (optional maintenance function)
export async function cleanupOldData(daysToKeep: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await sql`
      DELETE FROM questions 
      WHERE created_at < ${cutoffDate.toISOString()}
    `;

    console.log(`Cleaned up ${result.rowCount} old records`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up old data:', error);
    throw error;
  }
}