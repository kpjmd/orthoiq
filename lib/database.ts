import { neon } from '@neondatabase/serverless';
import { Question } from './types';

// Create a Neon SQL client
function getSql() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Log connection info for debugging (without sensitive data)
  const urlParts = connectionString.match(/^postgres:\/\/.*@([^:\/]+)/);
  const host = urlParts ? urlParts[1] : 'unknown';
  console.log(`Creating Neon SQL client for host: ${host}`);
  
  return neon(connectionString);
}

// Database initialization - creates tables if they don't exist
export async function initDatabase() {
  const sql = getSql();
  
  try {
    console.log('Attempting to initialize database with Neon...');
    
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

    await sql`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        fid VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_ratings_fid ON ratings(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        approved BOOLEAN NOT NULL,
        reviewer_fid VARCHAR(255) NOT NULL,
        reviewer_name VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_reviews_question_id ON reviews(question_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_fid ON reviews(reviewer_fid);
    `;

    console.log('Database initialized successfully with Neon');
  } catch (error) {
    console.error('Error initializing database:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
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
): Promise<number> {
  const sql = getSql();
  
  try {
    const result = await sql`
      INSERT INTO questions (fid, question, response, is_filtered, confidence)
      VALUES (${fid}, ${question}, ${response}, ${isFiltered}, ${confidence})
      RETURNING id
    `;
    return result[0].id;
  } catch (error) {
    console.error('Error logging interaction:', error);
    throw error;
  }
}

// Get interaction history for a user
export async function getUserHistory(fid: string, limit: number = 10): Promise<Question[]> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT id, fid, question, response, is_filtered as "isFiltered", 
             confidence, created_at as timestamp
      FROM questions 
      WHERE fid = ${fid}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;

    return result.map((row: any) => ({
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
  const sql = getSql();
  
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
      totalQuestions: parseInt(totalQuestions[0].count),
      uniqueUsers: parseInt(uniqueUsers[0].count),
      questionsToday: parseInt(questionsToday[0].count),
      avgConfidence: parseFloat(avgConfidence[0].avg_confidence) || 0,
      filteredQuestions: parseInt(filteredQuestions[0].count)
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
export async function checkRateLimitDB(fid: string): Promise<{allowed: boolean, resetTime?: Date, count: number}> {
  const sql = getSql();
  
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check recent questions count
    const recentQuestions = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE fid = ${fid} AND created_at > ${oneDayAgo.toISOString()}
    `;

    const count = parseInt(recentQuestions[0].count);
    const allowed = count < 1; // 1 question per day

    return {
      allowed,
      count,
      resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Default to allowing on error
    return { allowed: true, count: 0 };
  }
}

// Log a user rating for a response
export async function logRating(fid: string, question: string, rating: number): Promise<void> {
  const sql = getSql();
  
  try {
    await sql`
      INSERT INTO ratings (fid, question, rating)
      VALUES (${fid}, ${question}, ${rating})
    `;
  } catch (error) {
    console.error('Error logging rating:', error);
    throw error;
  }
}

// Get pending responses for admin review
export async function getPendingResponses(): Promise<any[]> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT q.id, q.fid, q.question, q.response, q.confidence, q.created_at as timestamp,
             'authenticated' as user_tier
      FROM questions q
      LEFT JOIN reviews r ON q.id = r.question_id
      WHERE r.id IS NULL AND q.is_filtered = false
      ORDER BY q.created_at ASC
      LIMIT 50
    `;

    return result.map((row: any) => ({
      id: row.id.toString(),
      fid: row.fid,
      question: row.question,
      response: row.response,
      confidence: row.confidence,
      timestamp: row.timestamp,
      userTier: row.user_tier
    }));
  } catch (error) {
    console.error('Error getting pending responses:', error);
    return [];
  }
}

// Review a response (approve or reject)
export async function reviewResponse(
  questionId: string, 
  approved: boolean, 
  reviewerFid: string, 
  reviewerName: string, 
  notes?: string
): Promise<void> {
  const sql = getSql();
  
  try {
    await sql`
      INSERT INTO reviews (question_id, approved, reviewer_fid, reviewer_name, notes)
      VALUES (${parseInt(questionId)}, ${approved}, ${reviewerFid}, ${reviewerName}, ${notes || ''})
    `;
  } catch (error) {
    console.error('Error reviewing response:', error);
    throw error;
  }
}

// Check if a response has been reviewed and approved
export async function getResponseStatus(questionId: string): Promise<{
  isReviewed: boolean;
  isApproved: boolean;
  reviewerName?: string;
}> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT approved, reviewer_name
      FROM reviews
      WHERE question_id = ${parseInt(questionId)}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return { isReviewed: false, isApproved: false };
    }

    return {
      isReviewed: true,
      isApproved: result[0].approved,
      reviewerName: result[0].reviewer_name
    };
  } catch (error) {
    console.error('Error getting response status:', error);
    return { isReviewed: false, isApproved: false };
  }
}

// Clean up old data (optional maintenance function)
export async function cleanupOldData(daysToKeep: number = 30) {
  const sql = getSql();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await sql`
      DELETE FROM questions 
      WHERE created_at < ${cutoffDate.toISOString()}
    `;

    console.log(`Cleaned up ${result.length} old records`);
    return result.length;
  } catch (error) {
    console.error('Error cleaning up old data:', error);
    throw error;
  }
}