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

    // User feedback table for RLHF training data
    await sql`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        fid VARCHAR(255) NOT NULL,
        was_helpful VARCHAR(20) NOT NULL CHECK (was_helpful IN ('yes', 'no', 'somewhat')),
        ai_answered BOOLEAN DEFAULT TRUE,
        improvement_suggestion TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT suggestion_length CHECK (LENGTH(improvement_suggestion) <= 500),
        UNIQUE(question_id, fid)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_feedback_question_id ON user_feedback(question_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_feedback_fid ON user_feedback(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_feedback_was_helpful ON user_feedback(was_helpful);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_feedback_ai_answered ON user_feedback(ai_answered);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);
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

    // Notification tokens table for Farcaster Mini App notifications
    await sql`
      CREATE TABLE IF NOT EXISTS notification_tokens (
        id SERIAL PRIMARY KEY,
        fid VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(fid, token)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_notification_tokens_fid ON notification_tokens(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_notification_tokens_enabled ON notification_tokens(enabled);
    `;

    // Notification logs table for tracking sent notifications
    await sql`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id SERIAL PRIMARY KEY,
        fid VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        target_url TEXT,
        delivered BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_fid ON notification_logs(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
    `;

    // Prescriptions table for storing prescription metadata and NFT data
    await sql`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        prescription_id VARCHAR(255) UNIQUE NOT NULL,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        fid VARCHAR(255) NOT NULL,
        rarity_type VARCHAR(20) NOT NULL CHECK (rarity_type IN ('common', 'uncommon', 'rare', 'ultra-rare')),
        theme_config JSONB NOT NULL,
        watermark_type VARCHAR(20) DEFAULT 'none',
        nft_metadata JSONB NOT NULL,
        verification_hash VARCHAR(255) NOT NULL,
        share_count INTEGER DEFAULT 0,
        download_count INTEGER DEFAULT 0,
        share_platforms JSONB DEFAULT '[]'::jsonb,
        payment_status VARCHAR(20) DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'completed')),
        payment_amount DECIMAL(10,2),
        payment_tx_hash VARCHAR(255),
        collection_position INTEGER,
        mint_status VARCHAR(20) DEFAULT 'not_minted' CHECK (mint_status IN ('not_minted', 'ready_to_mint', 'minted')),
        owner_fid VARCHAR(255),
        md_reviewed BOOLEAN DEFAULT FALSE,
        md_reviewer_name VARCHAR(255),
        md_review_notes TEXT,
        md_reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_prescription_id ON prescriptions(prescription_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_fid ON prescriptions(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_rarity ON prescriptions(rarity_type);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_mint_status ON prescriptions(mint_status);
    `;

    // Add new columns to existing prescriptions table if they don't exist
    try {
      await sql`
        ALTER TABLE prescriptions 
        ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS share_platforms JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'completed')),
        ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(255),
        ADD COLUMN IF NOT EXISTS collection_position INTEGER
      `;
    } catch (error) {
      console.log('Note: Some prescription table columns may already exist');
    }

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_payment_status ON prescriptions(payment_status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_collection_position ON prescriptions(collection_position);
    `;

    // Prescription downloads tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS prescription_downloads (
        id SERIAL PRIMARY KEY,
        prescription_id VARCHAR(255) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
        fid VARCHAR(255) NOT NULL,
        download_type VARCHAR(20) DEFAULT 'image' CHECK (download_type IN ('image', 'pdf', 'nft_metadata')),
        user_agent TEXT,
        ip_hash VARCHAR(255),
        downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_downloads_prescription_id ON prescription_downloads(prescription_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_downloads_fid ON prescription_downloads(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_downloads_downloaded_at ON prescription_downloads(downloaded_at);
    `;

    // Prescription shares tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS prescription_shares (
        id SERIAL PRIMARY KEY,
        prescription_id VARCHAR(255),
        platform VARCHAR(50) NOT NULL,
        share_url TEXT,
        clicks INTEGER DEFAULT 0,
        fid VARCHAR(255) NOT NULL,
        shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Drop and recreate constraints to be more flexible
    await sql`
      ALTER TABLE prescription_shares 
      DROP CONSTRAINT IF EXISTS prescription_shares_platform_check
    `;
    await sql`
      ALTER TABLE prescription_shares 
      DROP CONSTRAINT IF EXISTS prescription_shares_prescription_id_fkey
    `;
    await sql`
      ALTER TABLE prescription_shares 
      ADD CONSTRAINT prescription_shares_platform_check 
      CHECK (platform IN ('farcaster', 'twitter', 'facebook', 'telegram', 'email', 'copy_link', 'unified'))
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_shares_prescription_id ON prescription_shares(prescription_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_shares_platform ON prescription_shares(platform);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_shares_fid ON prescription_shares(fid);
    `;

    // Prescription collections summary table
    await sql`
      CREATE TABLE IF NOT EXISTS prescription_collections (
        id SERIAL PRIMARY KEY,
        fid VARCHAR(255) UNIQUE NOT NULL,
        total_prescriptions INTEGER DEFAULT 0,
        rarity_counts JSONB DEFAULT '{"common": 0, "uncommon": 0, "rare": 0, "ultra-rare": 0}'::jsonb,
        total_downloads INTEGER DEFAULT 0,
        total_shares INTEGER DEFAULT 0,
        last_prescription_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_collections_fid ON prescription_collections(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_collections_total_prescriptions ON prescription_collections(total_prescriptions);
    `;

    // Share data table for storing shared responses and artwork
    await sql`
      CREATE TABLE IF NOT EXISTS shares (
        id SERIAL PRIMARY KEY,
        share_id VARCHAR(255) UNIQUE NOT NULL,
        share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('response', 'artwork', 'prescription')),
        question TEXT NOT NULL,
        response TEXT NOT NULL,
        confidence REAL DEFAULT 0.0,
        artwork_metadata JSONB DEFAULT '{}'::jsonb,
        farcaster_data JSONB DEFAULT '{}'::jsonb,
        view_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_shares_share_id ON shares(share_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_shares_type ON shares(share_type);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares(expires_at);
    `;

    // Update existing shares table constraint to allow 'prescription' type
    try {
      await sql`
        ALTER TABLE shares DROP CONSTRAINT IF EXISTS shares_share_type_check;
      `;
      await sql`
        ALTER TABLE shares ADD CONSTRAINT shares_share_type_check 
        CHECK (share_type IN ('response', 'artwork', 'prescription'));
      `;
      console.log('Updated shares table constraint to allow prescription type');
    } catch (error) {
      console.log('Note: Shares table constraint update may have already been applied');
    }

    // Payment requests table for MD review payments
    await sql`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(255) UNIQUE NOT NULL,
        prescription_id VARCHAR(255) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        fid VARCHAR(255) NOT NULL,
        amount_usdc DECIMAL(10,2) NOT NULL DEFAULT 10.00,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
        payment_hash VARCHAR(255),
        wallet_address VARCHAR(255),
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP WITH TIME ZONE,
        refunded_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_payment_id ON payment_requests(payment_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_prescription_id ON payment_requests(prescription_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_fid ON payment_requests(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
    `;

    // MD review queue table
    await sql`
      CREATE TABLE IF NOT EXISTS md_review_queue (
        id SERIAL PRIMARY KEY,
        prescription_id VARCHAR(255) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
        payment_id VARCHAR(255) REFERENCES payment_requests(payment_id) ON DELETE CASCADE,
        fid VARCHAR(255) NOT NULL,
        priority INTEGER DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'expired')),
        assigned_to_md VARCHAR(255),
        review_notes TEXT,
        md_signature VARCHAR(255),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_md_review_queue_prescription_id ON md_review_queue(prescription_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_md_review_queue_payment_id ON md_review_queue(payment_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_md_review_queue_status ON md_review_queue(status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_md_review_queue_assigned_to_md ON md_review_queue(assigned_to_md);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_md_review_queue_expires_at ON md_review_queue(expires_at);
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

// Delete a question and all related data
export async function deleteQuestion(questionId: string): Promise<void> {
  const sql = getSql();
  
  try {
    // Delete cascades to reviews, review_details, and medical_categories due to foreign key constraints
    await sql`
      DELETE FROM questions WHERE id = ${parseInt(questionId)}
    `;
  } catch (error) {
    console.error('Error deleting question:', error);
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

// Enhanced database rate limiting with tier support (calendar day reset)
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
    
    // Define tier limits
    const tierLimits = { basic: 1, authenticated: 3, medical: 10 };
    const dailyLimit = tierLimits[tier];

    // Check questions count for current calendar day (UTC)
    const todayQuestions = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE fid = ${fid} AND DATE(created_at) = CURRENT_DATE
    `;

    const count = parseInt(todayQuestions[0].count);
    const allowed = count < dailyLimit;
    const remaining = Math.max(0, dailyLimit - count);

    // Calculate next midnight UTC for reset time
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      allowed,
      remaining,
      total: dailyLimit,
      tier,
      resetTime: tomorrow
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

// Get rate limit status without incrementing count (calendar day reset)
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
    
    // Define tier limits
    const tierLimits = { basic: 1, authenticated: 3, medical: 10 };
    const dailyLimit = tierLimits[tier];

    // Check questions count for current calendar day (UTC)
    const todayQuestions = await sql`
      SELECT COUNT(*) as count FROM questions 
      WHERE fid = ${fid} AND DATE(created_at) = CURRENT_DATE
    `;

    const count = parseInt(todayQuestions[0].count);
    const allowed = count < dailyLimit;
    const remaining = Math.max(0, dailyLimit - count);

    // Calculate next midnight UTC for reset time
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      allowed,
      remaining,
      total: dailyLimit,
      tier,
      resetTime: tomorrow
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    // Default to allowing on error
    const tierLimits = { basic: 1, authenticated: 3, medical: 10 };
    const dailyLimit = tierLimits[tier];
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return { 
      allowed: true, 
      remaining: dailyLimit, 
      total: dailyLimit, 
      tier,
      resetTime: tomorrow
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

// Log user feedback for RLHF training
export async function logUserFeedback(
  questionId: number,
  fid: string,
  wasHelpful: 'yes' | 'no' | 'somewhat',
  aiAnswered: boolean = true,
  improvementSuggestion?: string
): Promise<void> {
  const sql = getSql();
  
  try {
    await sql`
      INSERT INTO user_feedback (question_id, fid, was_helpful, ai_answered, improvement_suggestion)
      VALUES (${questionId}, ${fid}, ${wasHelpful}, ${aiAnswered}, ${improvementSuggestion || null})
      ON CONFLICT (question_id, fid) 
      DO UPDATE SET 
        was_helpful = EXCLUDED.was_helpful,
        ai_answered = EXCLUDED.ai_answered,
        improvement_suggestion = EXCLUDED.improvement_suggestion,
        created_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Error logging user feedback:', error);
    throw error;
  }
}

// Get user feedback for a specific question
export async function getUserFeedback(questionId: number, fid: string): Promise<any | null> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT was_helpful, ai_answered, improvement_suggestion, created_at
      FROM user_feedback
      WHERE question_id = ${questionId} AND fid = ${fid}
      LIMIT 1
    `;
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting user feedback:', error);
    return null;
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
    console.log('Getting training data with filters:', filters);
    
    // Base query without filters
    if (!filters || Object.keys(filters).filter(k => filters[k as keyof typeof filters] !== undefined).length === 0) {
      console.log('No filters, getting all approved training data');
      const result = await sql`
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
      `;
      console.log(`Found ${result.length} training records`);
      return result;
    }
    
    // Build query string manually for filtered queries
    let query = `
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
    
    // Add filters
    if (filters.specialty) {
      query += ` AND mc.specialty = '${filters.specialty}'`;
    }
    if (filters.complexity) {
      query += ` AND mc.complexity = '${filters.complexity}'`;
    }
    if (filters.responseQuality) {
      query += ` AND mc.response_quality = '${filters.responseQuality}'`;
    }
    if (filters.reviewType) {
      query += ` AND rd.review_type = '${filters.reviewType}'`;
    }
    
    query += ` ORDER BY q.created_at DESC`;
    
    if (filters.limit) {
      query += ` LIMIT ${filters.limit}`;
    }
    
    if (filters.offset) {
      query += ` OFFSET ${filters.offset}`;
    }
    
    console.log('Executing filtered query:', query);
    const result = await sql([query]);
    console.log(`Found ${result.length} training records`);
    
    return result;
  } catch (error) {
    console.error('Error getting training data:', error);
    console.error('Error details:', error);
    
    // If there's a database error, try a simpler query to check basic connectivity
    try {
      const testResult = await sql`SELECT COUNT(*) as count FROM questions`;
      console.log('Database connectivity test passed, questions count:', testResult[0].count);
    } catch (testError) {
      console.error('Database connectivity test failed:', testError);
    }
    
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
    console.log('Getting enhanced analytics...');
    
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

    // Get user feedback analytics
    const userFeedbackStats = await sql`
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN was_helpful = 'yes' THEN 1 END) as helpful_yes,
        COUNT(CASE WHEN was_helpful = 'no' THEN 1 END) as helpful_no,
        COUNT(CASE WHEN was_helpful = 'somewhat' THEN 1 END) as helpful_somewhat,
        COUNT(CASE WHEN ai_answered = false THEN 1 END) as ai_refusal_count,
        COUNT(CASE WHEN improvement_suggestion IS NOT NULL AND LENGTH(improvement_suggestion) > 0 THEN 1 END) as suggestions_count
      FROM user_feedback
    `;

    const feedbackByDay = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as feedback_count,
        COUNT(CASE WHEN was_helpful = 'yes' THEN 1 END) as helpful_yes,
        COUNT(CASE WHEN was_helpful = 'no' THEN 1 END) as helpful_no
      FROM user_feedback
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `;

    return {
      totalReviewed: parseInt(totalReviewed[0].count),
      approvalRate: approvalRate[0].total > 0 ? 
        (parseInt(approvalRate[0].approved) / parseInt(approvalRate[0].total) * 100) : 0,
      reviewTypeDistribution,
      specialtyDistribution,
      qualityDistribution,
      avgConfidenceScore: parseFloat(avgScores[0].avg_confidence) || 0,
      avgCommunicationQuality: parseFloat(avgScores[0].avg_communication) || 0,
      userFeedbackStats: userFeedbackStats[0] ? {
        totalFeedback: parseInt(userFeedbackStats[0].total_feedback),
        helpfulYes: parseInt(userFeedbackStats[0].helpful_yes),
        helpfulNo: parseInt(userFeedbackStats[0].helpful_no),
        helpfulSomewhat: parseInt(userFeedbackStats[0].helpful_somewhat),
        aiRefusalCount: parseInt(userFeedbackStats[0].ai_refusal_count),
        suggestionsCount: parseInt(userFeedbackStats[0].suggestions_count),
        helpfulnessRate: parseInt(userFeedbackStats[0].total_feedback) > 0 ? 
          ((parseInt(userFeedbackStats[0].helpful_yes) + parseInt(userFeedbackStats[0].helpful_somewhat)) / parseInt(userFeedbackStats[0].total_feedback) * 100) : 0
      } : {
        totalFeedback: 0,
        helpfulYes: 0,
        helpfulNo: 0,
        helpfulSomewhat: 0,
        aiRefusalCount: 0,
        suggestionsCount: 0,
        helpfulnessRate: 0
      },
      feedbackByDay
    };
  } catch (error) {
    console.error('Error getting enhanced analytics:', error);
    console.error('Error details:', error);
    
    // Try to test individual queries to find specific issues
    try {
      const testQueries = [
        { name: 'reviews count', query: sql`SELECT COUNT(*) as count FROM reviews` },
        { name: 'review_details count', query: sql`SELECT COUNT(*) as count FROM review_details` },
        { name: 'medical_categories count', query: sql`SELECT COUNT(*) as count FROM medical_categories` },
        { name: 'user_feedback count', query: sql`SELECT COUNT(*) as count FROM user_feedback` }
      ];
      
      for (const test of testQueries) {
        try {
          const result = await test.query;
          console.log(`${test.name}: ${result[0].count}`);
        } catch (testError) {
          console.error(`Failed ${test.name}:`, testError);
        }
      }
    } catch (testError) {
      console.error('Test queries failed:', testError);
    }
    
    return {
      totalReviewed: 0,
      approvalRate: 0,
      reviewTypeDistribution: [],
      specialtyDistribution: [],
      qualityDistribution: [],
      avgConfidenceScore: 0,
      avgCommunicationQuality: 0,
      userFeedbackStats: {
        totalFeedback: 0,
        helpfulYes: 0,
        helpfulNo: 0,
        helpfulSomewhat: 0,
        aiRefusalCount: 0,
        suggestionsCount: 0,
        helpfulnessRate: 0
      },
      feedbackByDay: []
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

// Share data functions
export async function createShare(
  shareType: 'response' | 'artwork' | 'prescription',
  question: string,
  response: string,
  confidence: number = 0.0,
  artworkMetadata?: any,
  farcasterData?: any,
  expiresInDays?: number
): Promise<string> {
  const sql = getSql();
  
  try {
    // Generate unique share ID
    const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Calculate expiration date (default 30 days)
    const expiresAt = expiresInDays ? 
      new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO shares (
        share_id, share_type, question, response, confidence,
        artwork_metadata, farcaster_data, expires_at
      )
      VALUES (
        ${shareId}, ${shareType}, ${question}, ${response}, ${confidence},
        ${JSON.stringify(artworkMetadata || {})}, 
        ${JSON.stringify(farcasterData || {})}, 
        ${expiresAt.toISOString()}
      )
    `;

    return shareId;
  } catch (error) {
    console.error('Error creating share:', error);
    throw error;
  }
}

export async function getShare(shareId: string): Promise<any | null> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT 
        share_id,
        share_type,
        question,
        response,
        confidence,
        artwork_metadata,
        farcaster_data,
        view_count,
        expires_at,
        created_at
      FROM shares 
      WHERE share_id = ${shareId} AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;

    if (result.length === 0) {
      return null;
    }

    const share = result[0];
    
    // Increment view count
    await sql`
      UPDATE shares 
      SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE share_id = ${shareId}
    `;

    return {
      shareId: share.share_id,
      shareType: share.share_type,
      question: share.question,
      response: share.response,
      confidence: share.confidence,
      artworkMetadata: share.artwork_metadata,
      farcasterData: share.farcaster_data,
      viewCount: share.view_count + 1,
      expiresAt: share.expires_at,
      createdAt: share.created_at
    };
  } catch (error) {
    console.error('Error getting share:', error);
    return null;
  }
}

export async function cleanupExpiredShares(): Promise<number> {
  const sql = getSql();
  
  try {
    const result = await sql`
      DELETE FROM shares 
      WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    `;

    console.log(`Cleaned up ${result.length} expired shares`);
    return result.length;
  } catch (error) {
    console.error('Error cleaning up expired shares:', error);
    throw error;
  }
}

// Prescription functions
export async function storePrescription(
  prescriptionId: string,
  questionId: number,
  fid: string,
  rarityType: string,
  themeConfig: any,
  watermarkType: string,
  nftMetadata: any,
  verificationHash: string
): Promise<number> {
  const sql = getSql();
  
  try {
    const result = await sql`
      INSERT INTO prescriptions (
        prescription_id, question_id, fid, rarity_type, 
        theme_config, watermark_type, nft_metadata, verification_hash
      )
      VALUES (
        ${prescriptionId}, ${questionId}, ${fid}, ${rarityType},
        ${JSON.stringify(themeConfig)}, ${watermarkType}, 
        ${JSON.stringify(nftMetadata)}, ${verificationHash}
      )
      RETURNING id
    `;
    
    // Update user collection stats
    await updateUserCollection(fid, rarityType);
    
    return result[0].id;
  } catch (error) {
    console.error('Error storing prescription:', error);
    throw error;
  }
}

export async function getPrescription(prescriptionId: string): Promise<any | null> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT 
        p.*,
        q.question,
        q.response,
        q.confidence
      FROM prescriptions p
      JOIN questions q ON p.question_id = q.id
      WHERE p.prescription_id = ${prescriptionId}
    `;

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0],
      themeConfig: result[0].theme_config,
      nftMetadata: result[0].nft_metadata
    };
  } catch (error) {
    console.error('Error getting prescription:', error);
    return null;
  }
}

export async function markPrescriptionShared(prescriptionId: string): Promise<void> {
  const sql = getSql();
  
  try {
    await sql`
      UPDATE prescriptions 
      SET share_count = share_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE prescription_id = ${prescriptionId}
    `;
  } catch (error) {
    console.error('Error marking prescription as shared:', error);
    throw error;
  }
}

export async function markMDReviewed(
  prescriptionId: string,
  reviewerName: string,
  reviewNotes?: string
): Promise<void> {
  const sql = getSql();
  
  try {
    await sql`
      UPDATE prescriptions 
      SET 
        md_reviewed = TRUE,
        md_reviewer_name = ${reviewerName},
        md_review_notes = ${reviewNotes || null},
        md_reviewed_at = CURRENT_TIMESTAMP,
        mint_status = 'ready_to_mint',
        updated_at = CURRENT_TIMESTAMP
      WHERE prescription_id = ${prescriptionId}
    `;
  } catch (error) {
    console.error('Error marking prescription as MD reviewed:', error);
    throw error;
  }
}

// Get user's prescription collection
export async function getUserPrescriptions(fid: string): Promise<any[]> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT 
        p.*,
        q.question,
        q.response,
        q.confidence
      FROM prescriptions p
      JOIN questions q ON p.question_id = q.id
      WHERE p.fid = ${fid}
      ORDER BY p.created_at DESC
    `;

    return result.map((row: any) => ({
      id: row.prescription_id,
      questionId: row.question_id,
      question: row.question,
      response: row.response,
      confidence: row.confidence,
      rarity: row.rarity_type,
      theme: row.theme_config,
      watermarkType: row.watermark_type,
      nftMetadata: row.nft_metadata,
      verificationHash: row.verification_hash,
      shareCount: row.share_count,
      downloadCount: row.download_count,
      sharePlatforms: row.share_platforms,
      paymentStatus: row.payment_status,
      paymentAmount: row.payment_amount,
      paymentTxHash: row.payment_tx_hash,
      collectionPosition: row.collection_position,
      mintStatus: row.mint_status,
      mdReviewed: row.md_reviewed,
      mdReviewerName: row.md_reviewer_name,
      mdReviewNotes: row.md_review_notes,
      mdReviewedAt: row.md_reviewed_at,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Error getting user prescriptions:', error);
    return [];
  }
}

// Track prescription download
export async function trackPrescriptionDownload(
  prescriptionId: string,
  fid: string,
  downloadType: 'image' | 'pdf' | 'nft_metadata' = 'image',
  userAgent?: string,
  ipHash?: string
): Promise<void> {
  const sql = getSql();
  
  try {
    // Insert download record
    await sql`
      INSERT INTO prescription_downloads (
        prescription_id, fid, download_type, user_agent, ip_hash
      )
      VALUES (${prescriptionId}, ${fid}, ${downloadType}, ${userAgent || null}, ${ipHash || null})
    `;

    // Update prescription download count
    await sql`
      UPDATE prescriptions 
      SET download_count = download_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE prescription_id = ${prescriptionId}
    `;

    // Update user collection stats
    await sql`
      INSERT INTO prescription_collections (fid, total_downloads)
      VALUES (${fid}, 1)
      ON CONFLICT (fid) 
      DO UPDATE SET 
        total_downloads = prescription_collections.total_downloads + 1,
        updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Error tracking prescription download:', error);
    throw error;
  }
}

// Track prescription share
export async function trackPrescriptionShare(
  prescriptionId: string,
  fid: string,
  platform: 'farcaster' | 'twitter' | 'facebook' | 'telegram' | 'email' | 'copy_link' | 'unified',
  shareUrl?: string
): Promise<void> {
  const sql = getSql();
  
  try {
    // Insert share record - but don't enforce foreign key constraint strictly
    await sql`
      INSERT INTO prescription_shares (
        prescription_id, fid, platform, share_url
      )
      VALUES (${prescriptionId}, ${fid}, ${platform}, ${shareUrl || null})
    `;

    // Update prescription share count and platforms only if prescription exists
    const updateResult = await sql`
      UPDATE prescriptions 
      SET 
        share_count = share_count + 1,
        share_platforms = CASE 
          WHEN share_platforms @> ${JSON.stringify([platform])}::jsonb 
          THEN share_platforms
          ELSE share_platforms || ${JSON.stringify([platform])}::jsonb
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE prescription_id = ${prescriptionId}
    `;

    // If no prescription record exists, that's ok for tracking purposes
    if (updateResult.length === 0) {
      console.log(`No prescription record found for ID: ${prescriptionId}, but share tracked`);
    }

    // Update user collection stats
    await sql`
      INSERT INTO prescription_collections (fid, total_shares)
      VALUES (${fid}, 1)
      ON CONFLICT (fid) 
      DO UPDATE SET 
        total_shares = prescription_collections.total_shares + 1,
        updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Error tracking prescription share:', error);
    throw error;
  }
}

// Update user collection stats when new prescription is created
export async function updateUserCollection(fid: string, rarityType: string): Promise<void> {
  const sql = getSql();
  
  try {
    await sql`
      INSERT INTO prescription_collections (
        fid, total_prescriptions, rarity_counts, last_prescription_at
      )
      VALUES (
        ${fid}, 
        1, 
        ${JSON.stringify({[rarityType]: 1, common: 0, uncommon: 0, rare: 0, 'ultra-rare': 0})},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (fid) 
      DO UPDATE SET 
        total_prescriptions = prescription_collections.total_prescriptions + 1,
        rarity_counts = jsonb_set(
          prescription_collections.rarity_counts,
          ARRAY[${rarityType}],
          (COALESCE(prescription_collections.rarity_counts->${rarityType}, '0'::jsonb)::int + 1)::text::jsonb
        ),
        last_prescription_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error('Error updating user collection:', error);
    throw error;
  }
}

// Get prescription analytics for admin dashboard
export async function getPrescriptionAnalytics(): Promise<any> {
  const sql = getSql();
  
  try {
    console.log('Getting prescription analytics...');
    
    const totalPrescriptions = await sql`
      SELECT COUNT(*) as count FROM prescriptions
    `;
    console.log('Total prescriptions:', totalPrescriptions[0].count);

    const rarityDistribution = await sql`
      SELECT rarity_type, COUNT(*) as count
      FROM prescriptions
      GROUP BY rarity_type
      ORDER BY 
        CASE rarity_type 
          WHEN 'common' THEN 1
          WHEN 'uncommon' THEN 2
          WHEN 'rare' THEN 3
          WHEN 'ultra-rare' THEN 4
        END
    `;

    const totalDownloads = await sql`
      SELECT SUM(download_count) as total_downloads FROM prescriptions
    `;

    const totalShares = await sql`
      SELECT SUM(share_count) as total_shares FROM prescriptions
    `;

    const platformDistribution = await sql`
      SELECT platform, COUNT(*) as count
      FROM prescription_shares
      GROUP BY platform
      ORDER BY count DESC
    `;

    const mdReviewStats = await sql`
      SELECT 
        COUNT(CASE WHEN md_reviewed = true THEN 1 END) as reviewed_count,
        COUNT(*) as total_count
      FROM prescriptions
    `;

    const paymentStats = await sql`
      SELECT 
        payment_status,
        COUNT(*) as count,
        COALESCE(SUM(payment_amount), 0) as total_amount
      FROM prescriptions
      GROUP BY payment_status
    `;

    const topCollectors = await sql`
      SELECT 
        pc.fid,
        pc.total_prescriptions,
        pc.rarity_counts,
        pc.total_downloads,
        pc.total_shares
      FROM prescription_collections pc
      ORDER BY pc.total_prescriptions DESC
      LIMIT 10
    `;

    const recentActivity = await sql`
      SELECT 
        p.prescription_id,
        p.fid,
        p.rarity_type,
        p.created_at,
        q.question
      FROM prescriptions p
      JOIN questions q ON p.question_id = q.id
      ORDER BY p.created_at DESC
      LIMIT 20
    `;

    return {
      totalPrescriptions: parseInt(totalPrescriptions[0].count),
      rarityDistribution,
      totalDownloads: parseInt(totalDownloads[0].total_downloads) || 0,
      totalShares: parseInt(totalShares[0].total_shares) || 0,
      platformDistribution,
      mdReviewStats: {
        reviewedCount: parseInt(mdReviewStats[0].reviewed_count),
        totalCount: parseInt(mdReviewStats[0].total_count),
        reviewRate: mdReviewStats[0].total_count > 0 ? 
          (parseInt(mdReviewStats[0].reviewed_count) / parseInt(mdReviewStats[0].total_count) * 100) : 0
      },
      paymentStats,
      topCollectors,
      recentActivity
    };
  } catch (error) {
    console.error('Error getting prescription analytics:', error);
    console.error('Error details:', error);
    
    // Try basic table checks
    try {
      const tableTests = [
        { name: 'prescriptions', query: sql`SELECT COUNT(*) as count FROM prescriptions` },
        { name: 'prescription_shares', query: sql`SELECT COUNT(*) as count FROM prescription_shares` },
        { name: 'prescription_collections', query: sql`SELECT COUNT(*) as count FROM prescription_collections` }
      ];
      
      for (const test of tableTests) {
        try {
          const result = await test.query;
          console.log(`${test.name} table count: ${result[0].count}`);
        } catch (testError) {
          console.error(`${test.name} table test failed:`, testError);
        }
      }
    } catch (tableTestError) {
      console.error('Table tests failed:', tableTestError);
    }
    
    return {
      totalPrescriptions: 0,
      rarityDistribution: [],
      totalDownloads: 0,
      totalShares: 0,
      platformDistribution: [],
      mdReviewStats: { reviewedCount: 0, totalCount: 0, reviewRate: 0 },
      paymentStats: [],
      topCollectors: [],
      recentActivity: []
    };
  }
}

// Get time-series prescription analytics
export async function getPrescriptionTimeSeries(days: number = 30): Promise<any> {
  const sql = getSql();
  
  try {
    const timeSeries = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as prescriptions,
        COUNT(CASE WHEN rarity_type = 'ultra-rare' THEN 1 END) as ultra_rare_count,
        AVG(CASE WHEN q.confidence IS NOT NULL THEN q.confidence ELSE 0.8 END) as avg_confidence
      FROM prescriptions p
      LEFT JOIN questions q ON p.question_id = q.id
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `;

    const rarityTrends = await sql`
      SELECT 
        DATE(created_at) as date,
        rarity_type,
        COUNT(*) as count
      FROM prescriptions
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at), rarity_type
      ORDER BY DATE(created_at), rarity_type
    `;

    return {
      timeSeries,
      rarityTrends
    };
  } catch (error) {
    console.error('Error getting prescription time series:', error);
    return { timeSeries: [], rarityTrends: [] };
  }
}

// Get engagement and viral metrics
export async function getEngagementMetrics(): Promise<any> {
  const sql = getSql();
  
  try {
    const shareMetrics = await sql`
      SELECT 
        ps.platform,
        COUNT(*) as total_shares,
        SUM(ps.clicks) as total_clicks,
        AVG(ps.clicks) as avg_clicks_per_share,
        COUNT(DISTINCT ps.fid) as unique_sharers
      FROM prescription_shares ps
      GROUP BY ps.platform
      ORDER BY total_shares DESC
    `;

    const viralCoefficient = await sql`
      WITH share_data AS (
        SELECT 
          ps.fid as sharer_fid,
          ps.clicks,
          ps.shared_at,
          p.fid as prescription_owner_fid
        FROM prescription_shares ps
        JOIN prescriptions p ON ps.prescription_id = p.prescription_id
        WHERE ps.shared_at >= CURRENT_DATE - INTERVAL '30 days'
      ),
      new_users AS (
        SELECT COUNT(DISTINCT fid) as new_user_count
        FROM prescriptions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ),
      total_shares AS (
        SELECT COUNT(*) as share_count
        FROM share_data
      )
      SELECT 
        CASE 
          WHEN ts.share_count > 0 THEN (nu.new_user_count::float / ts.share_count)
          ELSE 0 
        END as viral_coefficient
      FROM new_users nu, total_shares ts
    `;

    const engagementByRarity = await sql`
      SELECT 
        p.rarity_type,
        AVG(p.share_count) as avg_shares,
        AVG(p.download_count) as avg_downloads,
        COUNT(*) as total_prescriptions
      FROM prescriptions p
      GROUP BY p.rarity_type
      ORDER BY 
        CASE p.rarity_type 
          WHEN 'common' THEN 1
          WHEN 'uncommon' THEN 2
          WHEN 'rare' THEN 3
          WHEN 'ultra-rare' THEN 4
        END
    `;

    return {
      shareMetrics,
      viralCoefficient: viralCoefficient[0]?.viral_coefficient || 0,
      engagementByRarity
    };
  } catch (error) {
    console.error('Error getting engagement metrics:', error);
    return { shareMetrics: [], viralCoefficient: 0, engagementByRarity: [] };
  }
}

// Get user journey and retention analytics
export async function getUserJourneyAnalytics(): Promise<any> {
  const sql = getSql();
  
  try {
    const userRetention = await sql`
      WITH user_cohorts AS (
        SELECT 
          fid,
          DATE_TRUNC('week', MIN(created_at)) as cohort_week,
          MIN(created_at) as first_prescription
        FROM prescriptions
        GROUP BY fid
      ),
      cohort_sizes AS (
        SELECT 
          cohort_week,
          COUNT(*) as cohort_size
        FROM user_cohorts
        GROUP BY cohort_week
      ),
      user_activity AS (
        SELECT 
          uc.fid,
          uc.cohort_week,
          p.created_at,
          EXTRACT(epoch FROM (p.created_at - uc.first_prescription)) / 86400 as days_since_first
        FROM user_cohorts uc
        JOIN prescriptions p ON uc.fid = p.fid
      )
      SELECT 
        ua.cohort_week,
        cs.cohort_size,
        CASE 
          WHEN ua.days_since_first <= 1 THEN 'day_1'
          WHEN ua.days_since_first <= 7 THEN 'week_1'
          WHEN ua.days_since_first <= 30 THEN 'month_1'
          ELSE 'beyond_month_1'
        END as retention_period,
        COUNT(DISTINCT ua.fid) as active_users
      FROM user_activity ua
      JOIN cohort_sizes cs ON ua.cohort_week = cs.cohort_week
      GROUP BY ua.cohort_week, cs.cohort_size, retention_period
      ORDER BY ua.cohort_week, retention_period
    `;

    const prescriptionGenerationRate = await sql`
      WITH response_stats AS (
        SELECT 
          COUNT(*) as total_responses,
          COUNT(CASE WHEN q.id IN (SELECT DISTINCT question_id FROM prescriptions) THEN 1 END) as responses_with_prescriptions
        FROM questions q
        WHERE q.timestamp >= CURRENT_DATE - INTERVAL '30 days'
      )
      SELECT 
        total_responses,
        responses_with_prescriptions,
        CASE 
          WHEN total_responses > 0 THEN (responses_with_prescriptions::float / total_responses * 100)
          ELSE 0 
        END as generation_rate
      FROM response_stats
    `;

    const topMedicalTopics = await sql`
      SELECT 
        LOWER(TRIM(regexp_split_to_table(q.question, '\\s+'))) as word,
        COUNT(*) as frequency
      FROM prescriptions p
      JOIN questions q ON p.question_id = q.id
      WHERE LENGTH(TRIM(regexp_split_to_table(q.question, '\\s+'))) > 4
        AND LOWER(TRIM(regexp_split_to_table(q.question, '\\s+'))) NOT IN ('what', 'when', 'where', 'how', 'why', 'can', 'could', 'would', 'should', 'the', 'and', 'or', 'but', 'with', 'for', 'from', 'about', 'have', 'had', 'has', 'been', 'this', 'that', 'they', 'them', 'their')
      GROUP BY LOWER(TRIM(regexp_split_to_table(q.question, '\\s+')))
      HAVING COUNT(*) >= 3
      ORDER BY frequency DESC
      LIMIT 20
    `;

    return {
      userRetention,
      prescriptionGenerationRate: prescriptionGenerationRate[0] || { total_responses: 0, responses_with_prescriptions: 0, generation_rate: 0 },
      topMedicalTopics
    };
  } catch (error) {
    console.error('Error getting user journey analytics:', error);
    return { userRetention: [], prescriptionGenerationRate: { total_responses: 0, responses_with_prescriptions: 0, generation_rate: 0 }, topMedicalTopics: [] };
  }
}

// Get revenue projection analytics
export async function getRevenueProjections(): Promise<any> {
  const sql = getSql();
  
  try {
    const mdReviewCandidates = await sql`
      SELECT 
        p.prescription_id,
        p.fid,
        p.rarity_type,
        p.created_at,
        q.question,
        q.confidence,
        CASE 
          WHEN p.rarity_type = 'ultra-rare' THEN 25.00
          WHEN p.rarity_type = 'rare' THEN 15.00
          WHEN p.rarity_type = 'uncommon' THEN 10.00
          ELSE 5.00
        END as potential_value
      FROM prescriptions p
      JOIN questions q ON p.question_id = q.id
      WHERE p.md_reviewed = false
        AND q.confidence >= 0.7
        AND p.rarity_type IN ('rare', 'ultra-rare')
      ORDER BY 
        CASE p.rarity_type 
          WHEN 'ultra-rare' THEN 1
          WHEN 'rare' THEN 2
        END,
        q.confidence DESC
      LIMIT 50
    `;

    const revenueProjection = await sql`
      SELECT 
        COUNT(CASE WHEN rarity_type = 'ultra-rare' AND md_reviewed = false THEN 1 END) as ultra_rare_candidates,
        COUNT(CASE WHEN rarity_type = 'rare' AND md_reviewed = false THEN 1 END) as rare_candidates,
        COUNT(CASE WHEN rarity_type = 'uncommon' AND md_reviewed = false THEN 1 END) as uncommon_candidates,
        SUM(CASE 
          WHEN rarity_type = 'ultra-rare' AND md_reviewed = false THEN 25.00
          WHEN rarity_type = 'rare' AND md_reviewed = false THEN 15.00
          WHEN rarity_type = 'uncommon' AND md_reviewed = false THEN 10.00
          ELSE 0
        END) as potential_revenue
      FROM prescriptions p
      JOIN questions q ON p.question_id = q.id
      WHERE q.confidence >= 0.6
    `;

    const walletConnectionRate = await sql`
      WITH farcaster_users AS (
        SELECT DISTINCT fid
        FROM prescriptions
        WHERE fid IS NOT NULL
      ),
      total_users AS (
        SELECT COUNT(*) as total_count FROM farcaster_users
      )
      SELECT 
        tu.total_count as total_farcaster_users,
        COALESCE(COUNT(CASE WHEN p.payment_status != 'none' THEN 1 END), 0) as users_with_payments,
        CASE 
          WHEN tu.total_count > 0 THEN (COUNT(CASE WHEN p.payment_status != 'none' THEN 1 END)::float / tu.total_count * 100)
          ELSE 0 
        END as wallet_connection_rate
      FROM total_users tu
      LEFT JOIN prescriptions p ON true
      GROUP BY tu.total_count
    `;

    return {
      mdReviewCandidates,
      revenueProjection: revenueProjection[0] || { ultra_rare_candidates: 0, rare_candidates: 0, uncommon_candidates: 0, potential_revenue: 0 },
      walletConnectionRate: walletConnectionRate[0] || { total_farcaster_users: 0, users_with_payments: 0, wallet_connection_rate: 0 }
    };
  } catch (error) {
    console.error('Error getting revenue projections:', error);
    return { 
      mdReviewCandidates: [], 
      revenueProjection: { ultra_rare_candidates: 0, rare_candidates: 0, uncommon_candidates: 0, potential_revenue: 0 },
      walletConnectionRate: { total_farcaster_users: 0, users_with_payments: 0, wallet_connection_rate: 0 }
    };
  }
}

// Get user collection summary
export async function getUserCollectionSummary(fid: string): Promise<any> {
  const sql = getSql();
  
  try {
    const collection = await sql`
      SELECT * FROM prescription_collections
      WHERE fid = ${fid}
    `;

    if (collection.length === 0) {
      return {
        fid,
        totalPrescriptions: 0,
        rarityCounts: { common: 0, uncommon: 0, rare: 0, 'ultra-rare': 0 },
        totalDownloads: 0,
        totalShares: 0,
        lastPrescriptionAt: null
      };
    }

    const data = collection[0];
    return {
      fid: data.fid,
      totalPrescriptions: data.total_prescriptions,
      rarityCounts: data.rarity_counts,
      totalDownloads: data.total_downloads,
      totalShares: data.total_shares,
      lastPrescriptionAt: data.last_prescription_at,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error getting user collection summary:', error);
    return {
      fid,
      totalPrescriptions: 0,
      rarityCounts: { common: 0, uncommon: 0, rare: 0, 'ultra-rare': 0 },
      totalDownloads: 0,
      totalShares: 0,
      lastPrescriptionAt: null
    };
  }
}

// Payment request functions for MD review
export async function createPaymentRequest(
  prescriptionId: string,
  questionId: number,
  fid: string,
  amountUSDC: number = 10.00
): Promise<string> {
  const sql = getSql();
  
  try {
    // Generate unique payment ID
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await sql`
      INSERT INTO payment_requests (
        payment_id, prescription_id, question_id, fid, amount_usdc
      )
      VALUES (${paymentId}, ${prescriptionId}, ${questionId}, ${fid}, ${amountUSDC})
    `;
    
    return paymentId;
  } catch (error) {
    console.error('Error creating payment request:', error);
    throw error;
  }
}

export async function getPaymentRequest(paymentId: string): Promise<any | null> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT 
        pr.*,
        p.rarity_type,
        q.question,
        q.response,
        q.confidence
      FROM payment_requests pr
      JOIN prescriptions p ON pr.prescription_id = p.prescription_id
      JOIN questions q ON pr.question_id = q.id
      WHERE pr.payment_id = ${paymentId}
    `;
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting payment request:', error);
    return null;
  }
}

export async function updatePaymentStatus(
  paymentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded',
  paymentHash?: string,
  walletAddress?: string
): Promise<void> {
  const sql = getSql();
  
  try {
    // Update base status
    await sql`
      UPDATE payment_requests 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE payment_id = ${paymentId}
    `;
    
    // Update payment hash if provided
    if (paymentHash) {
      await sql`
        UPDATE payment_requests 
        SET payment_hash = ${paymentHash}
        WHERE payment_id = ${paymentId}
      `;
    }
    
    // Update wallet address if provided
    if (walletAddress) {
      await sql`
        UPDATE payment_requests 
        SET wallet_address = ${walletAddress}
        WHERE payment_id = ${paymentId}
      `;
    }
    
    // Update timestamp fields based on status
    if (status === 'completed') {
      await sql`
        UPDATE payment_requests 
        SET paid_at = CURRENT_TIMESTAMP
        WHERE payment_id = ${paymentId}
      `;
    }
    
    if (status === 'refunded') {
      await sql`
        UPDATE payment_requests 
        SET refunded_at = CURRENT_TIMESTAMP
        WHERE payment_id = ${paymentId}
      `;
    }
    
    // If payment completed, add to MD review queue
    if (status === 'completed') {
      await addToMDReviewQueue(paymentId);
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

export async function addToMDReviewQueue(paymentId: string): Promise<number> {
  const sql = getSql();
  
  try {
    // Get payment request details
    const paymentRequest = await sql`
      SELECT pr.*, p.rarity_type
      FROM payment_requests pr
      JOIN prescriptions p ON pr.prescription_id = p.prescription_id
      WHERE pr.payment_id = ${paymentId}
    `;
    
    if (paymentRequest.length === 0) {
      throw new Error('Payment request not found');
    }
    
    const request = paymentRequest[0];
    
    // Set priority based on rarity (higher rarity = higher priority)
    const priorityMap: { [key: string]: number } = {
      'ultra-rare': 1,
      'rare': 2,
      'uncommon': 3,
      'common': 4
    };
    
    const priority = priorityMap[request.rarity_type] || 4;
    
    const result = await sql`
      INSERT INTO md_review_queue (
        prescription_id, payment_id, fid, priority
      )
      VALUES (
        ${request.prescription_id}, 
        ${paymentId}, 
        ${request.fid}, 
        ${priority}
      )
      RETURNING id
    `;
    
    return result[0].id;
  } catch (error) {
    console.error('Error adding to MD review queue:', error);
    throw error;
  }
}

export async function getMDReviewQueue(): Promise<any[]> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT 
        mq.*,
        pr.amount_usdc,
        pr.paid_at,
        p.rarity_type,
        q.question,
        q.response,
        q.confidence
      FROM md_review_queue mq
      JOIN payment_requests pr ON mq.payment_id = pr.payment_id
      JOIN prescriptions p ON mq.prescription_id = p.prescription_id
      JOIN questions q ON pr.question_id = q.id
      WHERE mq.status IN ('pending', 'in_review')
      ORDER BY mq.priority ASC, mq.created_at ASC
    `;
    
    return result;
  } catch (error) {
    console.error('Error getting MD review queue:', error);
    return [];
  }
}

export async function completeMDReview(
  queueId: number,
  mdName: string,
  reviewNotes?: string,
  mdSignature?: string
): Promise<void> {
  const sql = getSql();
  
  try {
    // Update MD review queue
    await sql`
      UPDATE md_review_queue 
      SET 
        status = 'completed',
        assigned_to_md = ${mdName},
        review_notes = ${reviewNotes || null},
        md_signature = ${mdSignature || null},
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${queueId}
    `;
    
    // Get prescription ID to update prescription record
    const queueRecord = await sql`
      SELECT prescription_id FROM md_review_queue WHERE id = ${queueId}
    `;
    
    if (queueRecord.length > 0) {
      const prescriptionId = queueRecord[0].prescription_id;
      
      // Update prescription with MD review info
      await sql`
        UPDATE prescriptions 
        SET 
          md_reviewed = TRUE,
          md_reviewer_name = ${mdName},
          md_review_notes = ${reviewNotes || null},
          md_reviewed_at = CURRENT_TIMESTAMP,
          mint_status = 'ready_to_mint',
          updated_at = CURRENT_TIMESTAMP
        WHERE prescription_id = ${prescriptionId}
      `;
    }
  } catch (error) {
    console.error('Error completing MD review:', error);
    throw error;
  }
}

export async function getUserPaymentRequests(fid: string): Promise<any[]> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT 
        pr.*,
        p.rarity_type,
        p.md_reviewed,
        p.md_reviewer_name,
        q.question
      FROM payment_requests pr
      JOIN prescriptions p ON pr.prescription_id = p.prescription_id
      JOIN questions q ON pr.question_id = q.id
      WHERE pr.fid = ${fid}
      ORDER BY pr.created_at DESC
    `;
    
    return result;
  } catch (error) {
    console.error('Error getting user payment requests:', error);
    return [];
  }
}

export async function checkPrescriptionPaymentStatus(prescriptionId: string): Promise<{
  hasPaymentRequest: boolean;
  paymentStatus?: string;
  paymentId?: string;
  inReviewQueue: boolean;
}> {
  const sql = getSql();
  
  try {
    // Check for payment request
    const paymentRequest = await sql`
      SELECT payment_id, status
      FROM payment_requests
      WHERE prescription_id = ${prescriptionId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    // Check if in review queue
    const queueStatus = await sql`
      SELECT status
      FROM md_review_queue
      WHERE prescription_id = ${prescriptionId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    return {
      hasPaymentRequest: paymentRequest.length > 0,
      paymentStatus: paymentRequest.length > 0 ? paymentRequest[0].status : undefined,
      paymentId: paymentRequest.length > 0 ? paymentRequest[0].payment_id : undefined,
      inReviewQueue: queueStatus.length > 0 && queueStatus[0].status !== 'completed'
    };
  } catch (error) {
    console.error('Error checking prescription payment status:', error);
    return { hasPaymentRequest: false, inReviewQueue: false };
  }
}