// Migration script for prescription tracking features
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  console.log('Running prescription tracking migration...');
  
  try {
    // Add new columns to existing prescriptions table
    console.log('Adding new columns to prescriptions table...');
    await sql`
      ALTER TABLE prescriptions 
      ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS share_platforms JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS collection_position INTEGER
    `;
    
    // Add constraint if it doesn't exist
    try {
      await sql`
        ALTER TABLE prescriptions 
        ADD CONSTRAINT prescriptions_payment_status_check 
        CHECK (payment_status IN ('none', 'pending', 'completed'))
      `;
    } catch (error) {
      console.log('Payment status constraint may already exist');
    }

    // Create new indexes
    console.log('Creating new indexes...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_payment_status ON prescriptions(payment_status)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_collection_position ON prescriptions(collection_position)
    `;

    // Create prescription_downloads table
    console.log('Creating prescription_downloads table...');
    await sql`
      CREATE TABLE IF NOT EXISTS prescription_downloads (
        id SERIAL PRIMARY KEY,
        prescription_id VARCHAR(255) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
        fid VARCHAR(255) NOT NULL,
        download_type VARCHAR(20) DEFAULT 'image' CHECK (download_type IN ('image', 'pdf', 'nft_metadata')),
        user_agent TEXT,
        ip_hash VARCHAR(255),
        downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_downloads_prescription_id ON prescription_downloads(prescription_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_downloads_fid ON prescription_downloads(fid)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_downloads_downloaded_at ON prescription_downloads(downloaded_at)
    `;

    // Create prescription_shares table
    console.log('Creating prescription_shares table...');
    await sql`
      CREATE TABLE IF NOT EXISTS prescription_shares (
        id SERIAL PRIMARY KEY,
        prescription_id VARCHAR(255) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL CHECK (platform IN ('farcaster', 'twitter', 'facebook', 'telegram', 'email', 'copy_link')),
        share_url TEXT,
        clicks INTEGER DEFAULT 0,
        fid VARCHAR(255) NOT NULL,
        shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_shares_prescription_id ON prescription_shares(prescription_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_shares_platform ON prescription_shares(platform)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_shares_fid ON prescription_shares(fid)
    `;

    // Create prescription_collections table
    console.log('Creating prescription_collections table...');
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
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_collections_fid ON prescription_collections(fid)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_prescription_collections_total_prescriptions ON prescription_collections(total_prescriptions)
    `;

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();