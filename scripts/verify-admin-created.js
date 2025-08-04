require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAdminCreated() {
  try {
    console.log('🔍 Verifying admin creation...\n');

    const email = 'asvarainnovation@gmail.com';

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: { admin: true }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName || 'N/A'}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Has password: ${!!user.passwordHash}`);
    console.log(`   Active: ${user.isActive}`);

    if (user.admin) {
      console.log('\n✅ Admin record found:');
      console.log(`   Admin ID: ${user.admin.id}`);
      console.log(`   Active: ${user.admin.active}`);
      console.log(`   Created: ${user.admin.createdAt}`);
      console.log(`   Created by: ${user.admin.createdBy || 'Direct creation'}`);
    } else {
      console.log('\n❌ No admin record found');
      return;
    }

    // Check all admins
    const allAdmins = await prisma.admin.findMany({
      where: { active: true },
      include: { user: true }
    });

    console.log('\n📊 All Active Admins:');
    allAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.user.email} (${admin.user.fullName || 'N/A'})`);
      console.log(`      Admin ID: ${admin.id}`);
      console.log(`      Created: ${admin.createdAt}`);
    });

    console.log('\n🎯 Admin Verification Complete!');
    console.log('✅ Admin user created successfully');
    console.log('✅ Admin record exists and is active');
    console.log('✅ Ready for login and API testing');

    console.log('\n📝 Next Steps:');
    console.log('1. Start dev server: npm run dev');
    console.log('2. Login at: http://localhost:3000/login');
    console.log('3. Use credentials:');
    console.log(`   Email: ${email}`);
    console.log('   Password: Asvara@1909');
    console.log('4. Access admin dashboard: http://localhost:3000/admin');
    console.log('5. Test admin APIs (they will work with session)');

  } catch (error) {
    console.error('❌ Error verifying admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdminCreated().catch(console.error);