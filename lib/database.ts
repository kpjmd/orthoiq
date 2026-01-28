import { neon } from '@neondatabase/serverless';
import { Question, AgentTask, ResearchSynthesis } from './types';

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
        share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('response', 'artwork', 'prescription', 'intelligence-card')),
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
        CHECK (share_type IN ('response', 'artwork', 'prescription', 'intelligence-card'));
      `;
      console.log('Updated shares table constraint to allow prescription and intelligence-card types');
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

    // Agent system tables
    await sql`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id VARCHAR(255) PRIMARY KEY,
        agent_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        context_question TEXT NOT NULL,
        context_fid VARCHAR(255) NOT NULL,
        context_user_tier VARCHAR(20) NOT NULL CHECK (context_user_tier IN ('basic', 'authenticated', 'medical', 'scholar', 'practitioner', 'institution')),
        context_question_id INTEGER,
        context_metadata JSONB DEFAULT '{}'::jsonb,
        result_success BOOLEAN,
        result_data JSONB,
        result_error TEXT,
        result_enrichments JSONB DEFAULT '[]'::jsonb,
        result_cost DECIMAL(10,4) DEFAULT 0.0000,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_name ON agent_tasks(agent_name);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_context_fid ON agent_tasks(context_fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at);
    `;

    // Research synthesis tables
    await sql`
      CREATE TABLE IF NOT EXISTS research_syntheses (
        id VARCHAR(255) PRIMARY KEY,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        fid VARCHAR(255) NOT NULL,
        query_condition VARCHAR(255) NOT NULL,
        query_body_parts JSONB DEFAULT '[]'::jsonb,
        query_treatment_type VARCHAR(100),
        query_study_types JSONB DEFAULT '[]'::jsonb,
        query_max_age INTEGER DEFAULT 10,
        query_min_sample_size INTEGER DEFAULT 50,
        papers_analyzed JSONB DEFAULT '[]'::jsonb,
        synthesis TEXT NOT NULL,
        key_findings JSONB DEFAULT '[]'::jsonb,
        limitations JSONB DEFAULT '[]'::jsonb,
        clinical_relevance TEXT,
        evidence_strength VARCHAR(20) CHECK (evidence_strength IN ('strong', 'moderate', 'weak', 'insufficient')),
        study_count INTEGER DEFAULT 0,
        publication_years VARCHAR(20),
        total_citations INTEGER DEFAULT 0,
        avg_impact_factor DECIMAL(5,2) DEFAULT 0.00,
        rarity_tier VARCHAR(20) CHECK (rarity_tier IN ('bronze', 'silver', 'gold', 'platinum')),
        md_reviewed BOOLEAN DEFAULT FALSE,
        md_reviewer VARCHAR(255),
        md_notes TEXT,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        md_reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_syntheses_question_id ON research_syntheses(question_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_syntheses_fid ON research_syntheses(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_syntheses_rarity_tier ON research_syntheses(rarity_tier);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_syntheses_md_reviewed ON research_syntheses(md_reviewed);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_syntheses_evidence_strength ON research_syntheses(evidence_strength);
    `;

    // Research subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS research_subscriptions (
        fid VARCHAR(255) PRIMARY KEY,
        tier VARCHAR(20) NOT NULL CHECK (tier IN ('scholar', 'practitioner', 'institution')),
        bronze_quota INTEGER NOT NULL DEFAULT 5,
        silver_quota INTEGER NOT NULL DEFAULT 2,
        gold_quota INTEGER NOT NULL DEFAULT 0,
        bronze_used INTEGER DEFAULT 0,
        silver_used INTEGER DEFAULT 0,
        gold_used INTEGER DEFAULT 0,
        reset_date DATE DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT TRUE,
        subscription_start_date DATE DEFAULT CURRENT_DATE,
        subscription_end_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_subscriptions_tier ON research_subscriptions(tier);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_subscriptions_is_active ON research_subscriptions(is_active);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_subscriptions_reset_date ON research_subscriptions(reset_date);
    `;

    // Research NFT metadata table
    await sql`
      CREATE TABLE IF NOT EXISTS research_nfts (
        id SERIAL PRIMARY KEY,
        research_id VARCHAR(255) REFERENCES research_syntheses(id) ON DELETE CASCADE,
        nft_id VARCHAR(255) UNIQUE,
        token_id VARCHAR(100),
        contract_address VARCHAR(255),
        blockchain VARCHAR(50) DEFAULT 'base',
        rarity VARCHAR(20) CHECK (rarity IN ('bronze', 'silver', 'gold', 'platinum')),
        study_count INTEGER NOT NULL,
        publication_years VARCHAR(20),
        evidence_level VARCHAR(10),
        specialties JSONB DEFAULT '[]'::jsonb,
        citation_count INTEGER DEFAULT 0,
        impact_factor DECIMAL(5,2) DEFAULT 0.00,
        clinical_relevance INTEGER DEFAULT 5,
        times_viewed INTEGER DEFAULT 0,
        times_cited INTEGER DEFAULT 0,
        md_endorsements JSONB DEFAULT '[]'::jsonb,
        research_hash VARCHAR(255),
        metadata_uri TEXT,
        mint_status VARCHAR(20) DEFAULT 'pending' CHECK (mint_status IN ('pending', 'minted', 'failed')),
        mint_tx_hash VARCHAR(255),
        minted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_nfts_research_id ON research_nfts(research_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_nfts_nft_id ON research_nfts(nft_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_nfts_rarity ON research_nfts(rarity);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_research_nfts_mint_status ON research_nfts(mint_status);
    `;

    // OrthoIQ-Agents Integration: Consultations table
    await sql`
      CREATE TABLE IF NOT EXISTS consultations (
        id SERIAL PRIMARY KEY,
        consultation_id VARCHAR(255) UNIQUE NOT NULL,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        fid VARCHAR(255) NOT NULL,
        mode VARCHAR(20) DEFAULT 'fast' CHECK (mode IN ('fast', 'normal')),
        participating_specialists JSONB DEFAULT '[]'::jsonb,
        coordination_summary TEXT,
        specialist_count INTEGER DEFAULT 0,
        total_cost DECIMAL(10,4) DEFAULT 0.0000,
        execution_time INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultations_consultation_id ON consultations(consultation_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultations_fid ON consultations(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultations_question_id ON consultations(question_id);
    `;

    // Add is_private column for tracking page privacy control (Phase 2)
    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
    `;

    // OrthoIQ-Agents Integration: Consultation feedback table
    await sql`
      CREATE TABLE IF NOT EXISTS consultation_feedback (
        id SERIAL PRIMARY KEY,
        consultation_id VARCHAR(255) REFERENCES consultations(consultation_id) ON DELETE CASCADE,
        patient_id VARCHAR(255) NOT NULL,
        user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 10),
        outcome_success BOOLEAN,
        md_review_approved BOOLEAN,
        md_reviewer_name VARCHAR(255),
        md_review_date DATE,
        specialist_accuracy JSONB DEFAULT '{}'::jsonb,
        improvement_notes TEXT,
        pain_reduction INTEGER,
        functional_improvement DECIMAL(3,2),
        adherence_rate DECIMAL(3,2),
        time_to_recovery INTEGER,
        completed_phases JSONB DEFAULT '[]'::jsonb,
        token_rewards JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultation_feedback_consultation_id ON consultation_feedback(consultation_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultation_feedback_patient_id ON consultation_feedback(patient_id);
    `;

    // OrthoIQ-Agents Integration: Feedback milestones table
    await sql`
      CREATE TABLE IF NOT EXISTS feedback_milestones (
        id SERIAL PRIMARY KEY,
        milestone_id VARCHAR(255) UNIQUE NOT NULL,
        consultation_id VARCHAR(255) REFERENCES consultations(consultation_id) ON DELETE CASCADE,
        patient_id VARCHAR(255) NOT NULL,
        milestone_day INTEGER NOT NULL,
        pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
        functional_score INTEGER CHECK (functional_score >= 0 AND functional_score <= 100),
        adherence DECIMAL(3,2) CHECK (adherence >= 0 AND adherence <= 1),
        completed_interventions JSONB DEFAULT '[]'::jsonb,
        new_symptoms JSONB DEFAULT '[]'::jsonb,
        concern_flags JSONB DEFAULT '[]'::jsonb,
        overall_progress VARCHAR(20) CHECK (overall_progress IN ('improving', 'stable', 'worsening')),
        satisfaction_so_far INTEGER CHECK (satisfaction_so_far >= 0 AND satisfaction_so_far <= 10),
        difficulties_encountered JSONB DEFAULT '[]'::jsonb,
        milestone_achieved BOOLEAN,
        progress_status VARCHAR(20) CHECK (progress_status IN ('on_track', 'needs_attention', 'concerning')),
        token_reward INTEGER DEFAULT 0,
        reassessment_triggered BOOLEAN DEFAULT FALSE,
        adjusted_recommendations JSONB DEFAULT '[]'::jsonb,
        next_milestone_day INTEGER,
        encouragement TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_feedback_milestones_consultation_id ON feedback_milestones(consultation_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_feedback_milestones_patient_id ON feedback_milestones(patient_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_feedback_milestones_milestone_day ON feedback_milestones(milestone_day);
    `;

    // User preferences table for storing consultation mode preferences and user settings
    await sql`
      CREATE TABLE IF NOT EXISTS user_preferences (
        fid VARCHAR(255) PRIMARY KEY,
        preferred_mode VARCHAR(10) DEFAULT 'fast' CHECK (preferred_mode IN ('fast', 'normal')),
        preferred_platform VARCHAR(10) DEFAULT 'miniapp' CHECK (preferred_platform IN ('miniapp', 'web')),
        consultation_count INTEGER DEFAULT 0,
        last_consultation_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_fid ON user_preferences(fid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_last_consultation ON user_preferences(last_consultation_id);
    `;

    // Platform handoff table for web-to-miniapp transitions
    await sql`
      CREATE TABLE IF NOT EXISTS platform_handoffs (
        id SERIAL PRIMARY KEY,
        handoff_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        fid VARCHAR(255),
        consultation_id VARCHAR(255),
        handoff_link TEXT,
        claimed BOOLEAN DEFAULT FALSE,
        claimed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_platform_handoffs_handoff_id ON platform_handoffs(handoff_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_platform_handoffs_email ON platform_handoffs(email);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_platform_handoffs_consultation_id ON platform_handoffs(consultation_id);
    `;

    // Phase 3: Admin Dashboard - Add new columns to consultations table
    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'standard';
    `;

    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS consensus_percentage DECIMAL(5,4);
    `;

    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS total_token_stake DECIMAL(10,2);
    `;

    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_reviewed BOOLEAN DEFAULT false;
    `;

    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_approved BOOLEAN;
    `;

    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_clinical_accuracy INTEGER;
    `;

    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_feedback_notes TEXT;
    `;

    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS md_reviewed_at TIMESTAMP WITH TIME ZONE;
    `;

    // Add indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultations_tier ON consultations(tier);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultations_md_reviewed ON consultations(md_reviewed);
    `;

    // Phase 3: High-quality fast consultation flagging for MD review
    await sql`
      ALTER TABLE consultations
      ADD COLUMN IF NOT EXISTS requires_md_review BOOLEAN DEFAULT false;
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultations_requires_md_review
      ON consultations(requires_md_review)
      WHERE requires_md_review = true;
    `;

    // Phase 3: Create tracking_page_views table for return visit metrics
    await sql`
      CREATE TABLE IF NOT EXISTS tracking_page_views (
        id SERIAL PRIMARY KEY,
        case_id VARCHAR(255) NOT NULL,
        consultation_id VARCHAR(255),
        fid VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tracking_page_views_case_id ON tracking_page_views(case_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tracking_page_views_consultation_id ON tracking_page_views(consultation_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tracking_page_views_created_at ON tracking_page_views(created_at);
    `;

    // Phase 3: Create qr_scans table for engagement metrics
    await sql`
      CREATE TABLE IF NOT EXISTS qr_scans (
        id SERIAL PRIMARY KEY,
        case_id VARCHAR(255) NOT NULL,
        consultation_id VARCHAR(255),
        scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_qr_scans_case_id ON qr_scans(case_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_qr_scans_consultation_id ON qr_scans(consultation_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);
    `;

    // Web Users table for email-authenticated web app users
    await sql`
      CREATE TABLE IF NOT EXISTS web_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        email_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        verification_expires_at TIMESTAMP WITH TIME ZONE,
        daily_question_count INTEGER DEFAULT 0,
        last_question_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_web_users_verification_token ON web_users(verification_token);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_web_users_email ON web_users(email);
    `;

    // Web Sessions table for persistent 90-day sessions (milestone journey support)
    await sql`
      CREATE TABLE IF NOT EXISTS web_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_token VARCHAR(255) UNIQUE NOT NULL,
        web_user_id UUID NOT NULL REFERENCES web_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_web_sessions_token ON web_sessions(session_token);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_web_sessions_user_id ON web_sessions(web_user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);
    `;

    // Extend existing tables with web_user_id for web user support (nullable for backward compat)
    await sql`
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS web_user_id UUID REFERENCES web_users(id);
    `;

    await sql`
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS web_user_id UUID REFERENCES web_users(id);
    `;

    await sql`
      ALTER TABLE feedback_milestones ADD COLUMN IF NOT EXISTS web_user_id UUID REFERENCES web_users(id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_questions_web_user_id ON questions(web_user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_consultations_web_user_id ON consultations(web_user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_feedback_milestones_web_user_id ON feedback_milestones(web_user_id);
    `;

    // Web Rate Limits table for persistent rate limiting (survives server restarts)
    await sql`
      CREATE TABLE IF NOT EXISTS web_rate_limits (
        session_id VARCHAR(255) PRIMARY KEY,
        count INTEGER DEFAULT 0,
        reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_web_rate_limits_reset_time ON web_rate_limits(reset_time);
    `;

    console.log('Database initialized successfully with Neon (including agent, research, consultation feedback, user preference, Phase 3 admin dashboard, web user auth, and web rate limits tables)');
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
    const result = await sql(query);
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
  shareType: 'response' | 'artwork' | 'prescription' | 'intelligence-card',
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

// Agent system database functions
export async function createAgentTask(task: AgentTask): Promise<number> {
  const sql = getSql();
  
  try {
    const result = await sql`
      INSERT INTO agent_tasks (
        id, agent_name, status, context_question, context_fid, 
        context_user_tier, context_question_id, context_metadata,
        retry_count
      )
      VALUES (
        ${task.id}, ${task.agentName}, ${task.status}, ${task.context.question}, 
        ${task.context.fid}, ${task.context.userTier}, ${task.context.questionId || null},
        ${JSON.stringify(task.context.metadata || {})}, ${task.retryCount}
      )
      RETURNING id
    `;
    
    return 1; // Success
  } catch (error) {
    console.error('Error creating agent task:', error);
    throw error;
  }
}

export async function updateAgentTask(task: AgentTask): Promise<void> {
  const sql = getSql();
  
  try {
    await sql`
      UPDATE agent_tasks 
      SET 
        status = ${task.status},
        result_success = ${task.result?.success || null},
        result_data = ${task.result?.data ? JSON.stringify(task.result.data) : null},
        result_error = ${task.result?.error || null},
        result_enrichments = ${task.result?.enrichments ? JSON.stringify(task.result.enrichments) : null},
        result_cost = ${task.result?.cost || 0.0},
        retry_count = ${task.retryCount},
        started_at = ${task.startedAt?.toISOString() || null},
        completed_at = ${task.completedAt?.toISOString() || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${task.id}
    `;
  } catch (error) {
    console.error('Error updating agent task:', error);
    throw error;
  }
}

export async function getAgentTask(taskId: string): Promise<AgentTask | null> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT * FROM agent_tasks WHERE id = ${taskId}
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    return {
      id: row.id,
      agentName: row.agent_name,
      context: {
        question: row.context_question,
        fid: row.context_fid,
        userTier: row.context_user_tier,
        questionId: row.context_question_id,
        metadata: row.context_metadata
      },
      status: row.status,
      result: row.result_success !== null ? {
        success: row.result_success,
        data: row.result_data,
        error: row.result_error,
        enrichments: row.result_enrichments,
        cost: parseFloat(row.result_cost)
      } : undefined,
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      retryCount: row.retry_count
    };
  } catch (error) {
    console.error('Error getting agent task:', error);
    return null;
  }
}

// Research synthesis database functions
export async function storeResearchSynthesis(synthesis: ResearchSynthesis, questionId: number): Promise<void> {
  const sql = getSql();
  
  try {
    await sql`
      INSERT INTO research_syntheses (
        id, question_id, fid, query_condition, query_body_parts, 
        query_treatment_type, query_study_types, query_max_age, query_min_sample_size,
        papers_analyzed, synthesis, key_findings, limitations, clinical_relevance,
        evidence_strength, study_count, publication_years, total_citations,
        avg_impact_factor, rarity_tier, md_reviewed, md_reviewer, md_notes
      )
      VALUES (
        ${synthesis.id}, ${questionId}, 'unknown', ${synthesis.query.condition}, 
        ${JSON.stringify(synthesis.query.bodyParts)}, ${synthesis.query.treatmentType || null},
        ${JSON.stringify(synthesis.query.studyTypes || [])}, ${synthesis.query.maxAge || 10}, 
        ${synthesis.query.minSampleSize || 50}, ${JSON.stringify(synthesis.papers)},
        ${synthesis.synthesis}, ${JSON.stringify(synthesis.keyFindings)}, 
        ${JSON.stringify(synthesis.limitations)}, ${synthesis.clinicalRelevance},
        ${synthesis.evidenceStrength}, ${synthesis.papers.length}, 'unknown',
        0, 0.0, 'bronze', ${synthesis.mdReviewed}, ${synthesis.mdReviewer || null}, 
        ${synthesis.mdNotes || null}
      )
    `;
  } catch (error) {
    console.error('Error storing research synthesis:', error);
    throw error;
  }
}

export async function getResearchSynthesis(synthesisId: string): Promise<ResearchSynthesis | null> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT * FROM research_syntheses WHERE id = ${synthesisId}
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    return {
      id: row.id,
      query: {
        condition: row.query_condition,
        bodyParts: row.query_body_parts,
        treatmentType: row.query_treatment_type,
        studyTypes: row.query_study_types,
        maxAge: row.query_max_age,
        minSampleSize: row.query_min_sample_size
      },
      papers: row.papers_analyzed,
      synthesis: row.synthesis,
      keyFindings: row.key_findings,
      limitations: row.limitations,
      clinicalRelevance: row.clinical_relevance,
      evidenceStrength: row.evidence_strength,
      generatedAt: new Date(row.generated_at),
      mdReviewed: row.md_reviewed,
      mdReviewer: row.md_reviewer,
      mdNotes: row.md_notes
    };
  } catch (error) {
    console.error('Error getting research synthesis:', error);
    return null;
  }
}

export async function getUserResearchQuota(fid: string): Promise<{
  tier: string;
  bronzeQuota: number;
  silverQuota: number; 
  goldQuota: number;
  bronzeUsed: number;
  silverUsed: number;
  goldUsed: number;
  resetDate: Date;
} | null> {
  const sql = getSql();
  
  try {
    const result = await sql`
      SELECT * FROM research_subscriptions 
      WHERE fid = ${fid} AND is_active = true
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    return {
      tier: row.tier,
      bronzeQuota: row.bronze_quota,
      silverQuota: row.silver_quota,
      goldQuota: row.gold_quota,
      bronzeUsed: row.bronze_used,
      silverUsed: row.silver_used,
      goldUsed: row.gold_used,
      resetDate: new Date(row.reset_date)
    };
  } catch (error) {
    console.error('Error getting user research quota:', error);
    return null;
  }
}

export async function updateResearchUsage(fid: string, tier: 'bronze' | 'silver' | 'gold'): Promise<void> {
  const sql = getSql();

  try {
    const column = `${tier}_used`;
    await sql`
      UPDATE research_subscriptions
      SET ${sql(column)} = ${sql(column)} + 1, updated_at = CURRENT_TIMESTAMP
      WHERE fid = ${fid} AND is_active = true
    `;
  } catch (error) {
    console.error('Error updating research usage:', error);
    throw error;
  }
}

// OrthoIQ-Agents Integration: Store consultation metadata
export async function storeConsultation(data: {
  consultationId: string;
  questionId: number;
  fid: string;
  webUserId?: string;
  mode: 'fast' | 'normal';
  participatingSpecialists: string[];
  coordinationSummary?: string;
  specialistCount: number;
  totalCost?: number;
  executionTime?: number;
}): Promise<void> {
  const sql = getSql();

  try {
    await sql`
      INSERT INTO consultations (
        consultation_id, question_id, fid, web_user_id, mode, participating_specialists,
        coordination_summary, specialist_count, total_cost, execution_time
      ) VALUES (
        ${data.consultationId},
        ${data.questionId},
        ${data.fid},
        ${data.webUserId || null},
        ${data.mode},
        ${JSON.stringify(data.participatingSpecialists)},
        ${data.coordinationSummary || null},
        ${data.specialistCount},
        ${data.totalCost || 0},
        ${data.executionTime || null}
      )
    `;
    console.log(`Stored consultation ${data.consultationId} for question ${data.questionId}`);
  } catch (error) {
    console.error('Error storing consultation:', error);
    throw error;
  }
}

// OrthoIQ-Agents Integration: Store consultation feedback
export async function storeConsultationFeedback(data: {
  consultationId: string;
  patientId: string;
  userSatisfaction?: number;
  outcomeSuccess?: boolean;
  mdReviewApproved?: boolean;
  mdReviewerName?: string;
  mdReviewDate?: string;
  specialistAccuracy?: Record<string, number>;
  improvementNotes?: string;
  painReduction?: number;
  functionalImprovement?: number;
  adherenceRate?: number;
  timeToRecovery?: number;
  completedPhases?: string[];
  tokenRewards?: Array<{agent: string; reward: number; accuracy: number}>;
}): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      INSERT INTO consultation_feedback (
        consultation_id, patient_id, user_satisfaction, outcome_success,
        md_review_approved, md_reviewer_name, md_review_date, specialist_accuracy,
        improvement_notes, pain_reduction, functional_improvement, adherence_rate,
        time_to_recovery, completed_phases, token_rewards
      ) VALUES (
        ${data.consultationId},
        ${data.patientId},
        ${data.userSatisfaction || null},
        ${data.outcomeSuccess || null},
        ${data.mdReviewApproved || null},
        ${data.mdReviewerName || null},
        ${data.mdReviewDate || null},
        ${JSON.stringify(data.specialistAccuracy || {})},
        ${data.improvementNotes || null},
        ${data.painReduction || null},
        ${data.functionalImprovement || null},
        ${data.adherenceRate || null},
        ${data.timeToRecovery || null},
        ${JSON.stringify(data.completedPhases || [])},
        ${JSON.stringify(data.tokenRewards || [])}
      )
      RETURNING id
    `;

    const feedbackId = result[0].id;
    console.log(`Stored consultation feedback ${feedbackId} for consultation ${data.consultationId}`);
    return feedbackId;
  } catch (error) {
    console.error('Error storing consultation feedback:', error);
    throw error;
  }
}

// OrthoIQ-Agents Integration: Store milestone feedback
export async function storeMilestoneFeedback(data: {
  milestoneId: string;
  consultationId: string;
  patientId: string;
  milestoneDay: number;
  painLevel?: number;
  functionalScore?: number;
  adherence?: number;
  completedInterventions?: string[];
  newSymptoms?: string[];
  concernFlags?: string[];
  overallProgress?: 'improving' | 'stable' | 'worsening';
  satisfactionSoFar?: number;
  difficultiesEncountered?: string[];
  milestoneAchieved?: boolean;
  progressStatus?: 'on_track' | 'needs_attention' | 'concerning';
  tokenReward?: number;
  reassessmentTriggered?: boolean;
  adjustedRecommendations?: any[];
  nextMilestoneDay?: number;
  encouragement?: string;
}): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      INSERT INTO feedback_milestones (
        milestone_id, consultation_id, patient_id, milestone_day,
        pain_level, functional_score, adherence, completed_interventions,
        new_symptoms, concern_flags, overall_progress, satisfaction_so_far,
        difficulties_encountered, milestone_achieved, progress_status,
        token_reward, reassessment_triggered, adjusted_recommendations,
        next_milestone_day, encouragement
      ) VALUES (
        ${data.milestoneId},
        ${data.consultationId},
        ${data.patientId},
        ${data.milestoneDay},
        ${data.painLevel || null},
        ${data.functionalScore || null},
        ${data.adherence || null},
        ${JSON.stringify(data.completedInterventions || [])},
        ${JSON.stringify(data.newSymptoms || [])},
        ${JSON.stringify(data.concernFlags || [])},
        ${data.overallProgress || null},
        ${data.satisfactionSoFar || null},
        ${JSON.stringify(data.difficultiesEncountered || [])},
        ${data.milestoneAchieved || false},
        ${data.progressStatus || null},
        ${data.tokenReward || 0},
        ${data.reassessmentTriggered || false},
        ${JSON.stringify(data.adjustedRecommendations || [])},
        ${data.nextMilestoneDay || null},
        ${data.encouragement || null}
      )
      RETURNING id
    `;

    const milestoneRecordId = result[0].id;
    console.log(`Stored milestone feedback ${milestoneRecordId} for consultation ${data.consultationId}`);
    return milestoneRecordId;
  } catch (error) {
    console.error('Error storing milestone feedback:', error);
    throw error;
  }
}

// OrthoIQ-Agents Integration: Get consultation by ID
export async function getConsultation(consultationId: string): Promise<any | null> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT * FROM consultations WHERE consultation_id = ${consultationId}
    `;

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Error getting consultation:', error);
    return null;
  }
}

// OrthoIQ-Agents Integration: Get milestones for a consultation
export async function getConsultationMilestones(consultationId: string): Promise<any[]> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT * FROM feedback_milestones
      WHERE consultation_id = ${consultationId}
      ORDER BY milestone_day ASC
    `;

    return result;
  } catch (error) {
    console.error('Error getting consultation milestones:', error);
    return [];
  }
}

// OrthoIQ-Agents Integration: Update consultation privacy setting
export async function updateConsultationPrivacy(
  consultationId: string,
  isPrivate: boolean
): Promise<void> {
  const sql = getSql();

  try {
    await sql`
      UPDATE consultations
      SET is_private = ${isPrivate}
      WHERE consultation_id = ${consultationId}
    `;
    console.log(`Updated consultation ${consultationId} privacy to ${isPrivate}`);
  } catch (error) {
    console.error('Error updating consultation privacy:', error);
    throw error;
  }
}

// User Preferences: Get user preferences by FID
export async function getUserPreferences(fid: string): Promise<any | null> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT * FROM user_preferences
      WHERE fid = ${fid}
      LIMIT 1
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

// User Preferences: Update or create user preferences
export async function updateUserPreferences(fid: string, preferences: {
  preferred_mode?: 'fast' | 'normal';
  preferred_platform?: 'miniapp' | 'web';
  last_consultation_id?: string;
}): Promise<void> {
  const sql = getSql();

  try {
    const existing = await getUserPreferences(fid);

    if (existing) {
      // Update existing preferences
      await sql`
        UPDATE user_preferences
        SET
          preferred_mode = COALESCE(${preferences.preferred_mode || null}, preferred_mode),
          preferred_platform = COALESCE(${preferences.preferred_platform || null}, preferred_platform),
          last_consultation_id = COALESCE(${preferences.last_consultation_id || null}, last_consultation_id),
          consultation_count = consultation_count + ${preferences.last_consultation_id ? 1 : 0},
          updated_at = CURRENT_TIMESTAMP
        WHERE fid = ${fid}
      `;
    } else {
      // Create new preferences
      await sql`
        INSERT INTO user_preferences (
          fid, preferred_mode, preferred_platform, last_consultation_id, consultation_count
        ) VALUES (
          ${fid},
          ${preferences.preferred_mode || 'fast'},
          ${preferences.preferred_platform || 'miniapp'},
          ${preferences.last_consultation_id || null},
          ${preferences.last_consultation_id ? 1 : 0}
        )
      `;
    }

    console.log(`Updated user preferences for FID ${fid}`);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

// User Preferences: Get user consultation history
export async function getUserConsultations(fid: string, limit: number = 10): Promise<any[]> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT
        c.*,
        COUNT(fm.id) as milestone_count,
        MAX(fm.milestone_day) as latest_milestone
      FROM consultations c
      LEFT JOIN feedback_milestones fm ON c.consultation_id = fm.consultation_id
      WHERE c.fid = ${fid}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ${limit}
    `;

    return result;
  } catch (error) {
    console.error('Error getting user consultations:', error);
    return [];
  }
}

// Platform Handoff: Create a handoff link for web-to-miniapp transitions
export async function createPlatformHandoff(data: {
  email?: string;
  fid?: string;
  consultationId?: string;
}): Promise<string> {
  const sql = getSql();

  try {
    const handoffId = `handoff_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const miniappUrl = process.env.NEXT_PUBLIC_MINIAPP_URL || 'https://orthoiq.app';
    const handoffLink = `${miniappUrl}?handoff=${handoffId}${data.consultationId ? `&consultation=${data.consultationId}` : ''}`;

    await sql`
      INSERT INTO platform_handoffs (
        handoff_id, email, fid, consultation_id, handoff_link
      ) VALUES (
        ${handoffId},
        ${data.email || null},
        ${data.fid || null},
        ${data.consultationId || null},
        ${handoffLink}
      )
    `;

    console.log(`Created platform handoff ${handoffId}`);
    return handoffLink;
  } catch (error) {
    console.error('Error creating platform handoff:', error);
    throw error;
  }
}

// Platform Handoff: Claim a handoff (marks as used)
export async function claimPlatformHandoff(handoffId: string, fid: string): Promise<any | null> {
  const sql = getSql();

  try {
    const result = await sql`
      UPDATE platform_handoffs
      SET
        claimed = true,
        claimed_at = CURRENT_TIMESTAMP,
        fid = ${fid}
      WHERE handoff_id = ${handoffId}
        AND claimed = false
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING *
    `;

    if (result.length > 0) {
      console.log(`Claimed platform handoff ${handoffId} by FID ${fid}`);
      return result[0];
    }

    return null;
  } catch (error) {
    console.error('Error claiming platform handoff:', error);
    return null;
  }
}

// Platform Handoff: Get handoff details
export async function getPlatformHandoff(handoffId: string): Promise<any | null> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT * FROM platform_handoffs
      WHERE handoff_id = ${handoffId}
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting platform handoff:', error);
    return null;
  }
}

// ============================================
// Web User Authentication Functions
// ============================================

export interface WebUser {
  id: string;
  email: string;
  email_verified: boolean;
  verification_token: string | null;
  verification_expires_at: Date | null;
  daily_question_count: number;
  last_question_date: Date | null;
  created_at: Date;
  last_login: Date | null;
}

export interface WebSession {
  id: string;
  session_token: string;
  web_user_id: string;
  expires_at: Date;
  created_at: Date;
  last_active: Date;
}

// Create a new web user with email
export async function createWebUser(email: string): Promise<WebUser | null> {
  const sql = getSql();

  try {
    const verificationToken = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const result = await sql`
      INSERT INTO web_users (email, verification_token, verification_expires_at)
      VALUES (${email}, ${verificationToken}, ${expiresAt})
      ON CONFLICT (email) DO UPDATE SET
        verification_token = ${verificationToken},
        verification_expires_at = ${expiresAt}
      RETURNING *
    `;

    console.log(`Created/updated web user for email: ${email}`);
    return result[0] as WebUser;
  } catch (error) {
    console.error('Error creating web user:', error);
    return null;
  }
}

// Get web user by email
export async function getWebUserByEmail(email: string): Promise<WebUser | null> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT * FROM web_users WHERE email = ${email} LIMIT 1
    `;

    return result.length > 0 ? (result[0] as WebUser) : null;
  } catch (error) {
    console.error('Error getting web user by email:', error);
    return null;
  }
}

// Get web user by ID
export async function getWebUserById(id: string): Promise<WebUser | null> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT * FROM web_users WHERE id = ${id} LIMIT 1
    `;

    return result.length > 0 ? (result[0] as WebUser) : null;
  } catch (error) {
    console.error('Error getting web user by ID:', error);
    return null;
  }
}

// Verify web user by token (magic link verification)
// Works for both new users and returning users re-authenticating
export async function verifyWebUser(token: string): Promise<WebUser | null> {
  const sql = getSql();

  try {
    const result = await sql`
      UPDATE web_users
      SET
        email_verified = true,
        verification_token = NULL,
        verification_expires_at = NULL,
        last_login = CURRENT_TIMESTAMP
      WHERE verification_token = ${token}
        AND verification_expires_at > CURRENT_TIMESTAMP
      RETURNING *
    `;

    if (result.length > 0) {
      console.log(`Verified web user: ${result[0].email}`);
      return result[0] as WebUser;
    }

    return null;
  } catch (error) {
    console.error('Error verifying web user:', error);
    return null;
  }
}

// Update web user last login
export async function updateWebUserLogin(id: string): Promise<void> {
  const sql = getSql();

  try {
    await sql`
      UPDATE web_users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Error updating web user login:', error);
  }
}

// Increment daily question count for web user
export async function incrementDailyQuestionCount(id: string): Promise<{ count: number; isNewDay: boolean }> {
  const sql = getSql();

  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if it's a new day
    const user = await getWebUserById(id);
    const lastDate = user?.last_question_date ? new Date(user.last_question_date).toISOString().split('T')[0] : null;
    const isNewDay = lastDate !== today;

    if (isNewDay) {
      // Reset count for new day
      await sql`
        UPDATE web_users
        SET daily_question_count = 1, last_question_date = ${today}
        WHERE id = ${id}
      `;
      return { count: 1, isNewDay: true };
    } else {
      // Increment existing count
      const result = await sql`
        UPDATE web_users
        SET daily_question_count = daily_question_count + 1
        WHERE id = ${id}
        RETURNING daily_question_count
      `;
      return { count: result[0]?.daily_question_count || 1, isNewDay: false };
    }
  } catch (error) {
    console.error('Error incrementing daily question count:', error);
    return { count: 0, isNewDay: false };
  }
}

// Reset daily question counts (called by cron job)
export async function resetDailyQuestionCounts(): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      UPDATE web_users
      SET daily_question_count = 0
      WHERE last_question_date < CURRENT_DATE
      RETURNING id
    `;

    console.log(`Reset daily question counts for ${result.length} users`);
    return result.length;
  } catch (error) {
    console.error('Error resetting daily question counts:', error);
    return 0;
  }
}

// ============================================
// Web Session Management Functions
// ============================================

// Create a new web session (90 days for milestone journey)
export async function createWebSession(webUserId: string): Promise<WebSession | null> {
  const sql = getSql();

  try {
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

    const result = await sql`
      INSERT INTO web_sessions (session_token, web_user_id, expires_at)
      VALUES (${sessionToken}, ${webUserId}, ${expiresAt})
      RETURNING *
    `;

    console.log(`Created web session for user: ${webUserId}`);
    return result[0] as WebSession;
  } catch (error) {
    console.error('Error creating web session:', error);
    return null;
  }
}

// Get web session by token
export async function getWebSessionByToken(token: string): Promise<(WebSession & { user: WebUser }) | null> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT
        ws.*,
        wu.id as user_id,
        wu.email as user_email,
        wu.email_verified as user_email_verified,
        wu.daily_question_count as user_daily_question_count,
        wu.last_question_date as user_last_question_date,
        wu.created_at as user_created_at,
        wu.last_login as user_last_login
      FROM web_sessions ws
      JOIN web_users wu ON ws.web_user_id = wu.id
      WHERE ws.session_token = ${token}
        AND ws.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      session_token: row.session_token,
      web_user_id: row.web_user_id,
      expires_at: row.expires_at,
      created_at: row.created_at,
      last_active: row.last_active,
      user: {
        id: row.user_id,
        email: row.user_email,
        email_verified: row.user_email_verified,
        verification_token: null,
        verification_expires_at: null,
        daily_question_count: row.user_daily_question_count,
        last_question_date: row.user_last_question_date,
        created_at: row.user_created_at,
        last_login: row.user_last_login
      }
    };
  } catch (error) {
    console.error('Error getting web session by token:', error);
    return null;
  }
}

// Update session last active timestamp
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const sql = getSql();

  try {
    await sql`
      UPDATE web_sessions
      SET last_active = CURRENT_TIMESTAMP
      WHERE id = ${sessionId}
    `;
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}

// Delete expired sessions (called by cron job)
export async function deleteExpiredSessions(): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      DELETE FROM web_sessions
      WHERE expires_at < CURRENT_TIMESTAMP
      RETURNING id
    `;

    console.log(`Deleted ${result.length} expired sessions`);
    return result.length;
  } catch (error) {
    console.error('Error deleting expired sessions:', error);
    return 0;
  }
}

// Delete all sessions for a user (logout from all devices)
export async function deleteUserSessions(webUserId: string): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      DELETE FROM web_sessions
      WHERE web_user_id = ${webUserId}
      RETURNING id
    `;

    console.log(`Deleted ${result.length} sessions for user: ${webUserId}`);
    return result.length;
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    return 0;
  }
}

// Get web user's question count for rate limiting
export async function getWebUserQuestionStatus(id: string): Promise<{ count: number; limit: number; remaining: number; isVerified: boolean }> {
  const sql = getSql();

  try {
    const user = await getWebUserById(id);
    if (!user) {
      return { count: 0, limit: 1, remaining: 1, isVerified: false };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastDate = user.last_question_date ? new Date(user.last_question_date).toISOString().split('T')[0] : null;

    // Reset count if it's a new day
    const count = lastDate === today ? user.daily_question_count : 0;
    const limit = user.email_verified ? 10 : 1; // Verified: 10/day, Unverified: 1/day
    const remaining = Math.max(0, limit - count);

    return { count, limit, remaining, isVerified: user.email_verified };
  } catch (error) {
    console.error('Error getting web user question status:', error);
    return { count: 0, limit: 1, remaining: 1, isVerified: false };
  }
}

// ==================== WEB RATE LIMITS (Database-backed) ====================

export interface WebRateLimitEntry {
  session_id: string;
  count: number;
  reset_time: Date;
  is_verified: boolean;
}

/**
 * Get the current rate limit entry for a session ID
 * Returns null if no entry exists or if reset time has passed
 */
export async function getWebRateLimit(sessionId: string): Promise<WebRateLimitEntry | null> {
  const sql = getSql();

  try {
    const result = await sql`
      SELECT session_id, count, reset_time, is_verified
      FROM web_rate_limits
      WHERE session_id = ${sessionId}
        AND reset_time > NOW()
    `;

    if (result.length === 0) {
      return null;
    }

    return {
      session_id: result[0].session_id,
      count: result[0].count,
      reset_time: new Date(result[0].reset_time),
      is_verified: result[0].is_verified
    };
  } catch (error) {
    console.error('Error getting web rate limit:', error);
    return null;
  }
}

/**
 * Increment the rate limit count for a session ID
 * Creates a new entry if none exists or if reset time has passed
 * Returns the updated entry
 */
export async function incrementWebRateLimit(
  sessionId: string,
  isVerified: boolean = false
): Promise<WebRateLimitEntry> {
  const sql = getSql();
  const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  try {
    // Use upsert to create or update the entry
    const result = await sql`
      INSERT INTO web_rate_limits (session_id, count, reset_time, is_verified, updated_at)
      VALUES (${sessionId}, 1, ${resetTime}, ${isVerified}, NOW())
      ON CONFLICT (session_id) DO UPDATE SET
        count = CASE
          WHEN web_rate_limits.reset_time <= NOW() THEN 1
          ELSE web_rate_limits.count + 1
        END,
        reset_time = CASE
          WHEN web_rate_limits.reset_time <= NOW() THEN ${resetTime}
          ELSE web_rate_limits.reset_time
        END,
        is_verified = ${isVerified},
        updated_at = NOW()
      RETURNING session_id, count, reset_time, is_verified
    `;

    return {
      session_id: result[0].session_id,
      count: result[0].count,
      reset_time: new Date(result[0].reset_time),
      is_verified: result[0].is_verified
    };
  } catch (error) {
    console.error('Error incrementing web rate limit:', error);
    // Return a default entry on error (fail open for better UX)
    return {
      session_id: sessionId,
      count: 1,
      reset_time: resetTime,
      is_verified: isVerified
    };
  }
}

/**
 * Check rate limit status without incrementing
 * Returns the current count and remaining questions
 */
export async function checkWebRateLimitStatus(
  sessionId: string,
  isVerified: boolean = false
): Promise<{ count: number; remaining: number; total: number; resetTime: Date | null }> {
  const VERIFIED_LIMIT = 10;
  const UNVERIFIED_LIMIT = 1;
  const limit = isVerified ? VERIFIED_LIMIT : UNVERIFIED_LIMIT;

  const entry = await getWebRateLimit(sessionId);

  if (!entry) {
    // No entry or expired - user has full limit
    return {
      count: 0,
      remaining: limit,
      total: limit,
      resetTime: null
    };
  }

  const remaining = Math.max(0, limit - entry.count);

  return {
    count: entry.count,
    remaining,
    total: limit,
    resetTime: entry.reset_time
  };
}

/**
 * Clean up expired rate limit entries (optional maintenance function)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const sql = getSql();

  try {
    const result = await sql`
      DELETE FROM web_rate_limits
      WHERE reset_time <= NOW()
      RETURNING session_id
    `;

    return result.length;
  } catch (error) {
    console.error('Error cleaning up expired rate limits:', error);
    return 0;
  }
}