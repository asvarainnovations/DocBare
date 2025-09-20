import { PrismaClient, Prisma } from '@prisma/client';
import { isDevelopment, isProduction } from './env-validation';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Database configuration with connection pooling and build-time handling
const prismaConfig: Prisma.PrismaClientOptions = {
  log: isDevelopment() 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

// Create Prisma client with error handling for build-time
let prisma: PrismaClient;

try {
  prisma = globalForPrisma.prisma || new PrismaClient(prismaConfig);
} catch (error) {
  console.error('❌ [PRISMA][ERROR] Failed to create Prisma client:', error);
  
  // In build-time scenarios, create a mock client to prevent build failures
  if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
    console.warn('⚠️ [PRISMA][WARNING] Creating mock Prisma client for build-time');
    prisma = {
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      $transaction: () => Promise.resolve(),
      $queryRaw: () => Promise.resolve([]),
      $executeRaw: () => Promise.resolve(0),
      // Add other commonly used methods as no-ops
      user: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
      chatSession: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
      document: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
      feedback: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}), count: () => Promise.resolve(0) },
      account: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
      admin: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
      adminInvite: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
      pleadSmartChatMessage: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
      pleadSmartAgentMemory: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) },
    } as any;
  } else {
    throw error;
  }
}

export { prisma };

// Handle connection errors with graceful fallback
async function connectWithFallback() {
  try {
    await prisma.$connect();
    console.log('✅ [PRISMA][SUCCESS] Database connected successfully');
  } catch (error) {
    console.error('❌ [PRISMA][ERROR] Database connection failed:', error);
    
    // In build-time or when DATABASE_URL is not available, don't fail
    if (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.DATABASE_URL) {
      console.warn('⚠️ [PRISMA][WARNING] Skipping database connection during build phase');
      return;
    }
    
    // In development, allow the app to continue with warnings
    if (isDevelopment()) {
      console.warn('⚠️ [PRISMA][WARNING] Database connection failed, but continuing in development mode');
      return;
    }
    
    // In production, this is a critical error
    if (isProduction()) {
      console.error('🚨 [PRISMA][CRITICAL] Database connection failed in production');
      process.exit(1);
    }
  }
}

// Connect to database (with fallback handling)
connectWithFallback();

// Graceful shutdown
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ [PRISMA][SUCCESS] Database disconnected gracefully');
  } catch (error) {
    console.error('❌ [PRISMA][ERROR] Error during database disconnect:', error);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('🚨 [PRISMA][CRITICAL] Uncaught exception:', error);
  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error('❌ [PRISMA][ERROR] Error during emergency disconnect:', disconnectError);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('🚨 [PRISMA][CRITICAL] Unhandled promise rejection:', reason);
  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error('❌ [PRISMA][ERROR] Error during emergency disconnect:', disconnectError);
  }
  process.exit(1);
});

// Store in global for development hot reloading
if (isDevelopment()) {
  globalForPrisma.prisma = prisma;
} 