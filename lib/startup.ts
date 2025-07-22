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
    // Initialize database tables
    await initDatabase();
    console.log('✅ Database initialization completed');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    throw error;
  }
}

// Auto-initialize on import in production
if (process.env.NODE_ENV === 'production') {
  ensureInitialized().catch(error => {
    console.error('Failed to initialize application:', error);
  });
}