#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Testing connection to GCP PostgreSQL database...');
    await prisma.$connect();
    console.log('✅ Connection successful!');

    // Get database version
    const version = await prisma.$queryRaw`SELECT version();`;
    console.log('PostgreSQL version:', version[0].version);

    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `;
    console.log('Tables in public schema:');
    tables.forEach(t => console.log(' -', t.table_name));
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 