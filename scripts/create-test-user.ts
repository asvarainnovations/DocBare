import { prisma } from '../lib/prisma';

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    
    const testUser = await prisma.user.upsert({
      where: { email: 'test@docbare.com' },
      update: {},
      create: {
        email: 'test@docbare.com',
        passwordHash: 'test-hash',
        fullName: 'Test User'
      }
    });
    
    console.log(`✅ Test user created/found: ${testUser.id}`);
    console.log(`📧 Email: ${testUser.email}`);
    console.log(`👤 Name: ${testUser.fullName}`);
    
    return testUser;
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
