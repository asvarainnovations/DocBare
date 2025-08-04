require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addAdminDirectly() {
  try {
    console.log('🔧 Adding admin directly...\n');

    // Get email from command line argument or use default
    const email = process.argv[2] || 'asvarainnovation@gmail.com';
    const password = process.argv[3] || 'Asvara@1909';
    const fullName = process.argv[4] || 'Asvara Admin';

    console.log('📋 Admin Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${fullName}`);
    console.log('');

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: { admin: true }
    });

    if (user) {
      console.log('📋 User already exists:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.fullName || 'N/A'}`);
      console.log(`   Admin: ${user.admin ? 'Yes' : 'No'}`);

      if (user.admin) {
        console.log('⚠️  User is already an admin!');
        console.log(`   Admin ID: ${user.admin.id}`);
        console.log(`   Active: ${user.admin.active}`);
        return;
      }

      // Update password if needed
      if (!user.passwordHash) {
        const passwordHash = await bcrypt.hash(password, 10);
        user = await prisma.user.update({
          where: { email },
          data: { 
            passwordHash,
            fullName: fullName
          },
          include: { admin: true }
        });
        console.log('✅ Password updated for existing user');
      }
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role: 'USER',
          isActive: true
        },
        include: { admin: true }
      });
      console.log('✅ New user created');
    }

    // Create admin record
    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
        active: true,
        // No createdBy since this is a direct addition
      }
    });

    console.log('✅ Admin record created successfully');
    console.log(`   Admin ID: ${admin.id}`);

    console.log('\n🎉 Admin added successfully!');
    console.log('📝 Login Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Admin ID: ${admin.id}`);
    console.log('\n🔐 You can now:');
    console.log('   1. Login at http://localhost:3000/login');
    console.log('   2. Access admin dashboard at http://localhost:3000/admin');
    console.log('   3. Create additional admin invites');
    console.log('   4. Test admin APIs with authentication');

  } catch (error) {
    console.error('❌ Error adding admin:', error);
    
    if (error.code === 'P2002') {
      console.log('\n💡 User with this email already exists.');
      console.log('   Try using a different email or check if they are already an admin.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Usage instructions
if (process.argv.length < 3) {
  console.log('📖 Usage:');
  console.log('   node scripts/add-admin-directly.js <email> [password] [fullName]');
  console.log('');
  console.log('📋 Examples:');
  console.log('   node scripts/add-admin-directly.js admin@example.com');
  console.log('   node scripts/add-admin-directly.js admin@example.com mypassword123');
  console.log('   node scripts/add-admin-directly.js admin@example.com mypassword123 "John Doe"');
  console.log('');
}

addAdminDirectly().catch(console.error); 