import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    // Try to count users (if table exists)
    const userCount = await prisma.user.count();
    console.info('🟩 [test_prisma][SUCCESS] Prisma/Postgres connection OK. User count:', userCount);
  } catch (err) {
    const error = err as any;
    console.error('🟥 [test_prisma][ERROR] Prisma test error:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

test(); 