import { prisma } from '../lib/prisma';

async function cleanupAndCreateUser() {
  try {
    console.log('🧹 Cleaning up database...');
    
    // Clean up all related data first
    await prisma.chatMessage.deleteMany();
    await prisma.chatSession.deleteMany();
    await prisma.document.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.adminInvite.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Database cleaned up');
    
    // Create a new user with the expected ID
    const user = await prisma.user.create({
      data: {
        id: '7da4ba9a-e3b6-49b6-b812-26957e3cd5c6',
        email: 'test@docbare.com',
        passwordHash: 'test-hash',
        fullName: 'Test User'
      }
    });
    
    console.log(`✅ User created with expected ID: ${user.id}`);
    console.log(`📧 Email: ${user.email}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAndCreateUser();
