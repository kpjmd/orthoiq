#!/usr/bin/env node

/**
 * Script to generate a bcrypt hash for the admin password
 * Usage: node scripts/generate-admin-hash.js "your_password_here"
 */

const bcrypt = require('bcryptjs');

function generatePasswordHash(password) {
  if (!password) {
    console.error('Usage: node scripts/generate-admin-hash.js "your_password_here"');
    process.exit(1);
  }

  // Generate salt with cost factor of 12 (good security/performance balance)
  const saltRounds = 12;
  const hash = bcrypt.hashSync(password, saltRounds);
  
  console.log('Generated password hash:');
  console.log(hash);
  console.log('\nAdd this to your environment variables:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('\n⚠️  Keep this hash secure and never commit it to version control!');
}

// Get password from command line argument
const password = process.argv[2];
generatePasswordHash(password);