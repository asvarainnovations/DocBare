require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createFirstAdmin() {
  try {
    console.log('🔧 Creating first admin user...\n');

    // Check if any admin already exists
    const existingAdmin = await prisma.admin.findFirst({
      where: { active: true },
      include: { user: true }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin already exists:');
      console.log(`   Email: ${existingAdmin.user.email}`);
      console.log(`   Name: ${existingAdmin.user.fullName || 'N/A'}`);
      console.log(`   Admin ID: ${existingAdmin.id}`);
      console.log('\n✅ No action needed - admin system is ready!');
      return;
    }

    // Create admin user details
    const adminEmail = process.env.FIRST_ADMIN_EMAIL || 'balyanrajat1812@gmail.com';
    const adminPassword = process.env.FIRST_ADMIN_PASSWORD || 'docbare@admin2706';
    const adminName = process.env.FIRST_ADMIN_NAME || 'Rajat Balyan';

    console.log('📋 Admin Details:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create user first
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: adminName,
        role: 'USER', // Regular user role, admin status is separate
        isActive: true
      }
    });

    console.log('✅ User created successfully');

    // Create admin record
    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
        active: true,
        // No createdBy since this is the first admin
      }
    });

    console.log('✅ Admin record created successfully');

    console.log('\n🎉 First admin user created successfully!');
    console.log('📝 Login Details:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Admin ID: ${admin.id}`);
    console.log('\n🔐 You can now:');
    console.log('   1. Login at http://localhost:3000/login');
    console.log('   2. Access admin dashboard at http://localhost:3000/admin');
    console.log('   3. Create additional admin invites');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    
    if (error.code === 'P2002') {
      console.log('\n💡 User with this email already exists. You can:');
      console.log('   1. Use a different email in .env file');
      console.log('   2. Or manually promote the existing user to admin');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createFirstAdmin().catch(console.error); 