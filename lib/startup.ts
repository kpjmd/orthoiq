import { initDatabase } from './database';

let initPromise: Promise<void> | null = null;

export async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initialize();
  }
  return initPromise;
}

async function initialize(): Promise<void> {
  console.log('Starting application initialization...');
  
  try {
    // Check environment variables first
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Initialize database tables
    await initDatabase();
    console.log('✅ Database initialization completed');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    
    // Don't throw in production - let the app start but log the issue
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ App starting with database initialization failure. Database operations may fail.');
    } else {
      throw error;
    }
  }
}

// Auto-initialize on import in production
if (process.env.NODE_ENV === 'production') {
  ensureInitialized().catch(error => {
    console.error('Failed to initialize application:', error);
  });
}