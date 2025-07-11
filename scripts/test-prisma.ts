import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    // Try to count users (if table exists)
    const userCount = await prisma.user.count();
    console.log('Prisma/Postgres connection OK. User count:', userCount);
  } catch (err) {
    console.error('Prisma test error:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

test(); 