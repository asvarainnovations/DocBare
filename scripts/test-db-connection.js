#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.info('🟦 [test_db][INFO] Testing connection to GCP PostgreSQL database...');
    await prisma.$connect();
    console.info('🟩 [test_db][SUCCESS] Connection successful!');

    // Get database version
    const version = await prisma.$queryRaw`SELECT version();`;
    console.info('🟦 [test_db][INFO] PostgreSQL version:', version[0].version);

    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `;
    console.info('🟦 [test_db][INFO] Tables in public schema:');
    tables.forEach(t => console.info('   -', t.table_name));
  } catch (err) {
    console.error('🟥 [test_db][ERROR] Connection failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 