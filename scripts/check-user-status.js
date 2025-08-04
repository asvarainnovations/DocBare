require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserStatus() {
  try {
    console.log('🔍 Checking user status...\n');

    const userEmail = process.env.FIRST_ADMIN_EMAIL || 'balyanrajat1812@gmail.com';

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { 
        admin: true,
        accounts: true
      }
    });

    if (!user) {
      console.log(`❌ User with email ${userEmail} not found`);
      console.log('\n💡 You need to:');
      console.log('   1. Create a user account first (via signup or registration)');
      console.log('   2. Then promote that user to admin');
      return;
    }

    console.log(`✅ User found: ${user.fullName || 'N/A'} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Has password: ${!!user.passwordHash}`);
    console.log(`   OAuth accounts: ${user.accounts.length}`);

    // Check admin status
    if (user.admin) {
      console.log('\n🔐 Admin Status:');
      console.log(`   ✅ User is an admin`);
      console.log(`   Admin ID: ${user.admin.id}`);
      console.log(`   Admin active: ${user.admin.active}`);
      console.log(`   Admin created: ${user.admin.createdAt}`);
      console.log(`   Created by: ${user.admin.createdBy || 'First admin (no creator)'}`);
    } else {
      console.log('\n🔐 Admin Status:');
      console.log(`   ❌ User is NOT an admin`);
      console.log('\n💡 To make this user an admin, run:');
      console.log('   node scripts/promote-user-to-admin.js');
    }

    // Check if there are any other admins
    const allAdmins = await prisma.admin.findMany({
      where: { active: true },
      include: { user: true }
    });

    console.log('\n📊 Admin System Status:');
    console.log(`   Total active admins: ${allAdmins.length}`);
    
    if (allAdmins.length > 0) {
      console.log('   Active admins:');
      allAdmins.forEach((admin, index) => {
        console.log(`     ${index + 1}. ${admin.user.email} (${admin.user.fullName || 'N/A'})`);
      });
    } else {
      console.log('   ⚠️  No active admins found!');
      console.log('   💡 You need to create the first admin.');
    }

  } catch (error) {
    console.error('❌ Error checking user status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserStatus().catch(console.error); 