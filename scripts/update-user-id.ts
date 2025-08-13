import { prisma } from '../lib/prisma';

async function updateUserId() {
  try {
    console.log('🔄 Updating user ID...');
    
    // First, delete the existing user
    await prisma.user.deleteMany({
      where: { email: 'test@docbare.com' }
    });
    
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
    console.error('❌ Error updating user ID:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserId();
