require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function promoteUserToAdmin() {
  try {
    console.log('🔧 Promoting user to admin...\n');

    const userEmail = process.env.FIRST_ADMIN_EMAIL || 'balyanrajat1812@gmail.com';

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { admin: true }
    });

    if (!user) {
      console.log(`❌ User with email ${userEmail} not found`);
      return;
    }

    console.log(`📋 User found: ${user.fullName} (${user.email})`);

    // Check if user is already an admin
    if (user.admin) {
      console.log('⚠️  User is already an admin!');
      console.log(`   Admin ID: ${user.admin.id}`);
      console.log(`   Active: ${user.admin.active}`);
      return;
    }

    // Create admin record
    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
        active: true,
        // No createdBy since this is the first admin
      }
    });

    console.log('✅ Admin record created successfully');
    console.log(`   Admin ID: ${admin.id}`);

    console.log('\n🎉 User promoted to admin successfully!');
    console.log('📝 Admin Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName || 'N/A'}`);
    console.log(`   Admin ID: ${admin.id}`);
    console.log('\n🔐 You can now:');
    console.log('   1. Login at http://localhost:3000/login');
    console.log('   2. Access admin dashboard at http://localhost:3000/admin');
    console.log('   3. Create additional admin invites');

  } catch (error) {
    console.error('❌ Error promoting user to admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

promoteUserToAdmin().catch(console.error); 