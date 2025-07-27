#!/usr/bin/env node

/**
 * Script to test the new Neon database connection
 * Usage: node scripts/test-database.js
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function testDatabase() {
  console.log('Testing Neon database connection...\n');
  
  // Check if DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Make sure you have created a .env.local file with your new Neon credentials');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is configured');
  
  // Test connection
  try {
    const sql = neon(databaseUrl);
    
    // Simple query to test connection
    console.log('🔄 Testing database connection...');
    const result = await sql`SELECT 1 as test, NOW() as current_time`;
    
    console.log('✅ Database connection successful!');
    console.log(`📅 Current database time: ${result[0].current_time}`);
    
    // Test if tables exist
    console.log('\n🔄 Checking if tables exist...');
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('questions', 'ratings', 'reviews')
    `;
    
    if (tablesResult.length > 0) {
      console.log('✅ Application tables found:');
      tablesResult.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    } else {
      console.log('ℹ️  No application tables found yet (they will be created on first API call)');
    }
    
    console.log('\n🎉 Database test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Add these environment variables to Vercel');
    console.log('2. Deploy your application');
    console.log('3. Test the /api/health/database endpoint');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify your DATABASE_URL is correct');
    console.log('2. Check that your Neon database is active');
    console.log('3. Ensure your IP is whitelisted (if applicable)');
    process.exit(1);
  }
}

testDatabase();