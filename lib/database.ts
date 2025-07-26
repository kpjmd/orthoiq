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

    // Enhanced review details table for AI training
    await sql`
      CREATE TABLE IF NOT EXISTS review_details (
        id SERIAL PRIMARY KEY,
        review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
        review_type VARCHAR(50) NOT NULL CHECK (review_type IN (
          'approve_as_is', 
          'approve_with_additions', 
          'approve_with_corrections', 
          'reject_medical_inaccuracy', 
          'reject_inappropriate_scope', 
          'reject_poor_communication'
        )),
        additions_text TEXT,
        corrections_text TEXT,
        teaching_notes TEXT,
        confidence_score INTEGER CHECK (confidence_score >= 1 AND confidence_score <= 10),
        communication_quality INTEGER CHECK (communication_quality >= 1 AND communication_quality <= 10),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_review_details_review_id ON review_details(review_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_review_details_type ON review_details(review_type);
    `;

    // Medical categorization table for training data organization
    await sql`
      CREATE TABLE IF NOT EXISTS medical_categories (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        specialty VARCHAR(50) CHECK (specialty IN (
          'shoulder', 'knee', 'spine', 'hip', 'foot_ankle', 
          'hand_wrist', 'sports_medicine', 'trauma', 'pediatric_ortho', 'general'
        )),
        complexity VARCHAR(20) CHECK (complexity IN ('basic', 'intermediate', 'advanced')),
        response_quality VARCHAR(20) CHECK (response_quality IN ('excellent', 'good', 'needs_work', 'poor')),
        common_issues JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_medical_categories_question_id ON medical_categories(question_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_medical_categories_specialty ON medical_categories(specialty);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_medical_categories_complexity ON medical_categories(complexity);
    `;

    // Training data export tracking
    await sql`
      CREATE TABLE IF NOT EXISTS training_exports (
        id SERIAL PRIMARY KEY,
        export_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        criteria JSONB,
        format VARCHAR(20) CHECK (format IN ('jsonl', 'csv', 'json')),
        record_count INTEGER NOT NULL,
        file_path TEXT,
        exported_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_training_exports_date ON training_exports(export_date);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_training_exports_format ON training_exports(format);
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

// Enhanced database rate limiting with tier support
export async function checkRateLimitDBWithTiers(fid: string, tier: 'basic' | 'authenticated' | 'medical' = 'basic'): Promise<{
  allowed: boolean;
  resetTime?: Date;
  remaining?: number;
  total?: number;
  tier?: string;
}> {
  const sql = getSql();
  
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Define tier limits
    const tierLimits = { basic: 1, authenticated: 3, medical: 10 };
    const dailyLimit = tierLimits[tier];

    // Check recent questions count
    const recentQuestions = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE fid = ${fid} AND created_at > ${oneDayAgo.toISOString()}
    `;

    const count = parseInt(recentQuestions[0].count);
    const allowed = count < dailyLimit;
    const remaining = Math.max(0, dailyLimit - count);

    return {
      allowed,
      remaining,
      total: dailyLimit,
      tier,
      resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    };
  } catch (error) {
    console.error('Error checking rate limit with tiers:', error);
    // Default to allowing on error
    return { 
      allowed: true, 
      remaining: 1, 
      total: 1, 
      tier 
    };
  }
}

// Get rate limit status without incrementing count
export async function getRateLimitStatusDB(fid: string, tier: 'basic' | 'authenticated' | 'medical' = 'basic'): Promise<{
  allowed: boolean;
  resetTime?: Date;
  remaining?: number;
  total?: number;
  tier?: string;
}> {
  const sql = getSql();
  
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Define tier limits
    const tierLimits = { basic: 1, authenticated: 3, medical: 10 };
    const dailyLimit = tierLimits[tier];

    // Check recent questions count
    const recentQuestions = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE fid = ${fid} AND created_at > ${oneDayAgo.toISOString()}
    `;

    const count = parseInt(recentQuestions[0].count);
    const allowed = count < dailyLimit;
    const remaining = Math.max(0, dailyLimit - count);

    return {
      allowed,
      remaining,
      total: dailyLimit,
      tier,
      resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    // Default to allowing on error
    const tierLimits = { basic: 1, authenticated: 3, medical: 10 };
    const dailyLimit = tierLimits[tier];
    return { 
      allowed: true, 
      remaining: dailyLimit, 
      total: dailyLimit, 
      tier 
    };
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

// Enhanced review response with detailed feedback for AI training
export async function reviewResponse(
  questionId: string, 
  approved: boolean, 
  reviewerFid: string, 
  reviewerName: string, 
  notes?: string,
  reviewDetails?: {
    reviewType: string;
    additionsText?: string;
    correctionsText?: string;
    teachingNotes?: string;
    confidenceScore?: number;
    communicationQuality?: number;
  },
  medicalCategory?: {
    specialty?: string;
    complexity?: string;
    responseQuality?: string;
    commonIssues?: string[];
  }
): Promise<number> {
  const sql = getSql();
  
  try {
    // Insert main review
    const reviewResult = await sql`
      INSERT INTO reviews (question_id, approved, reviewer_fid, reviewer_name, notes)
      VALUES (${parseInt(questionId)}, ${approved}, ${reviewerFid}, ${reviewerName}, ${notes || ''})
      RETURNING id
    `;
    
    const reviewId = reviewResult[0].id;

    // Insert detailed review data for AI training
    if (reviewDetails) {
      await sql`
        INSERT INTO review_details (
          review_id, review_type, additions_text, corrections_text, 
          teaching_notes, confidence_score, communication_quality
        )
        VALUES (
          ${reviewId}, 
          ${reviewDetails.reviewType}, 
          ${reviewDetails.additionsText || null}, 
          ${reviewDetails.correctionsText || null},
          ${reviewDetails.teachingNotes || null}, 
          ${reviewDetails.confidenceScore || null}, 
          ${reviewDetails.communicationQuality || null}
        )
      `;
    }

    // Insert medical categorization
    if (medicalCategory) {
      // Check if category already exists
      const existingCategory = await sql`
        SELECT id FROM medical_categories WHERE question_id = ${parseInt(questionId)}
      `;

      if (existingCategory.length > 0) {
        // Update existing category
        await sql`
          UPDATE medical_categories SET
            specialty = ${medicalCategory.specialty || null},
            complexity = ${medicalCategory.complexity || null},
            response_quality = ${medicalCategory.responseQuality || null},
            common_issues = ${JSON.stringify(medicalCategory.commonIssues || [])},
            updated_at = CURRENT_TIMESTAMP
          WHERE question_id = ${parseInt(questionId)}
        `;
      } else {
        // Insert new category
        await sql`
          INSERT INTO medical_categories (
            question_id, specialty, complexity, response_quality, common_issues
          )
          VALUES (
            ${parseInt(questionId)}, 
            ${medicalCategory.specialty || null}, 
            ${medicalCategory.complexity || null}, 
            ${medicalCategory.responseQuality || null},
            ${JSON.stringify(medicalCategory.commonIssues || [])}
          )
        `;
      }
    }

    return reviewId;
  } catch (error) {
    console.error('Error reviewing response:', error);
    throw error;
  }
}

// Check if a response has been reviewed and approved with enhanced details
export async function getResponseStatus(questionId: string): Promise<{
  isReviewed: boolean;
  isApproved: boolean;
  reviewerName?: string;
  reviewType?: string;
  hasAdditions?: boolean;
  hasCorrections?: boolean;
  additionsText?: string;
  correctionsText?: string;
}> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT 
        r.approved, 
        r.reviewer_name,
        rd.review_type,
        rd.additions_text,
        rd.corrections_text
      FROM reviews r
      LEFT JOIN review_details rd ON r.id = rd.review_id
      WHERE r.question_id = ${parseInt(questionId)}
      ORDER BY r.created_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return { isReviewed: false, isApproved: false };
    }

    const review = result[0];
    return {
      isReviewed: true,
      isApproved: review.approved,
      reviewerName: review.reviewer_name,
      reviewType: review.review_type,
      hasAdditions: !!(review.additions_text && review.additions_text.trim()),
      hasCorrections: !!(review.corrections_text && review.corrections_text.trim()),
      additionsText: review.additions_text,
      correctionsText: review.corrections_text
    };
  } catch (error) {
    console.error('Error getting response status:', error);
    return { isReviewed: false, isApproved: false };
  }
}

// Get training data for export (approved responses with detailed feedback)
export async function getTrainingData(filters?: {
  specialty?: string;
  complexity?: string;
  responseQuality?: string;
  reviewType?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const sql = getSql();
  
  try {
    // Build the base query with all joins
    let result;
    
    if (!filters || Object.keys(filters).length === 0) {
      // No filters - get all approved training data
      result = await sql`
        SELECT 
          q.id,
          q.question,
          q.response,
          q.confidence,
          r.approved,
          r.notes as reviewer_notes,
          rd.review_type,
          rd.additions_text,
          rd.corrections_text,
          rd.teaching_notes,
          rd.confidence_score,
          rd.communication_quality,
          mc.specialty,
          mc.complexity,
          mc.response_quality,
          mc.common_issues,
          q.created_at
        FROM questions q
        JOIN reviews r ON q.id = r.question_id
        LEFT JOIN review_details rd ON r.id = rd.review_id
        LEFT JOIN medical_categories mc ON q.id = mc.question_id
        WHERE r.approved = true
        ORDER BY q.created_at DESC
        ${filters?.limit ? sql`LIMIT ${filters.limit}` : sql``}
      `;
    } else {
      // Apply filters
      let baseQuery = sql`
        SELECT 
          q.id,
          q.question,
          q.response,
          q.confidence,
          r.approved,
          r.notes as reviewer_notes,
          rd.review_type,
          rd.additions_text,
          rd.corrections_text,
          rd.teaching_notes,
          rd.confidence_score,
          rd.communication_quality,
          mc.specialty,
          mc.complexity,
          mc.response_quality,
          mc.common_issues,
          q.created_at
        FROM questions q
        JOIN reviews r ON q.id = r.question_id
        LEFT JOIN review_details rd ON r.id = rd.review_id
        LEFT JOIN medical_categories mc ON q.id = mc.question_id
        WHERE r.approved = true
      `;

      // Add filters dynamically
      if (filters.specialty) {
        baseQuery = sql`${baseQuery} AND mc.specialty = ${filters.specialty}`;
      }
      if (filters.complexity) {
        baseQuery = sql`${baseQuery} AND mc.complexity = ${filters.complexity}`;
      }
      if (filters.responseQuality) {
        baseQuery = sql`${baseQuery} AND mc.response_quality = ${filters.responseQuality}`;
      }
      if (filters.reviewType) {
        baseQuery = sql`${baseQuery} AND rd.review_type = ${filters.reviewType}`;
      }

      baseQuery = sql`${baseQuery} ORDER BY q.created_at DESC`;
      
      if (filters.limit) {
        baseQuery = sql`${baseQuery} LIMIT ${filters.limit}`;
      }
      
      result = await baseQuery;
    }

    return result;
  } catch (error) {
    console.error('Error getting training data:', error);
    return [];
  }
}

// Log training data export
export async function logTrainingExport(
  criteria: any,
  format: string,
  recordCount: number,
  filePath: string,
  exportedBy: string
): Promise<number> {
  const sql = getSql();
  
  try {
    const result = await sql`
      INSERT INTO training_exports (criteria, format, record_count, file_path, exported_by)
      VALUES (${JSON.stringify(criteria)}, ${format}, ${recordCount}, ${filePath}, ${exportedBy})
      RETURNING id
    `;
    
    return result[0].id;
  } catch (error) {
    console.error('Error logging training export:', error);
    throw error;
  }
}

// Get enhanced analytics for AI training dashboard
export async function getEnhancedAnalytics() {
  const sql = getSql();
  
  try {
    const totalReviewed = await sql`
      SELECT COUNT(*) as count FROM reviews
    `;

    const approvalRate = await sql`
      SELECT 
        COUNT(CASE WHEN approved = true THEN 1 END) as approved,
        COUNT(*) as total
      FROM reviews
    `;

    const reviewTypeDistribution = await sql`
      SELECT review_type, COUNT(*) as count
      FROM review_details
      GROUP BY review_type
      ORDER BY count DESC
    `;

    const specialtyDistribution = await sql`
      SELECT specialty, COUNT(*) as count
      FROM medical_categories
      WHERE specialty IS NOT NULL
      GROUP BY specialty
      ORDER BY count DESC
    `;

    const qualityDistribution = await sql`
      SELECT response_quality, COUNT(*) as count
      FROM medical_categories
      WHERE response_quality IS NOT NULL
      GROUP BY response_quality
      ORDER BY count DESC
    `;

    const avgScores = await sql`
      SELECT 
        AVG(confidence_score) as avg_confidence,
        AVG(communication_quality) as avg_communication
      FROM review_details
      WHERE confidence_score IS NOT NULL OR communication_quality IS NOT NULL
    `;

    return {
      totalReviewed: parseInt(totalReviewed[0].count),
      approvalRate: approvalRate[0].total > 0 ? 
        (parseInt(approvalRate[0].approved) / parseInt(approvalRate[0].total) * 100) : 0,
      reviewTypeDistribution,
      specialtyDistribution,
      qualityDistribution,
      avgConfidenceScore: parseFloat(avgScores[0].avg_confidence) || 0,
      avgCommunicationQuality: parseFloat(avgScores[0].avg_communication) || 0
    };
  } catch (error) {
    console.error('Error getting enhanced analytics:', error);
    return {
      totalReviewed: 0,
      approvalRate: 0,
      reviewTypeDistribution: [],
      specialtyDistribution: [],
      qualityDistribution: [],
      avgConfidenceScore: 0,
      avgCommunicationQuality: 0
    };
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