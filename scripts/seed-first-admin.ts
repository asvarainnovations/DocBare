import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedFirstAdmin() {
  try {
    console.log('🌱 Starting first admin seeding...');

    // Check if any admin already exists
    const existingAdmin = await prisma.admin.findFirst();
    if (existingAdmin) {
      console.log('⚠️  Admin already exists. Skipping first admin creation.');
      return;
    }

    // Create the first admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const user = await prisma.user.create({
      data: {
        email: 'admin@asvara.com',
        passwordHash: hashedPassword,
        fullName: 'Asvara Admin',
        name: 'Asvara Admin',
        role: 'ADMIN'
      }
    });

    // Create admin record
    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
        // No createdBy for the first admin
        active: true
      }
    });

    console.log('✅ First admin created successfully!');
    console.log('\n📊 Admin Details:');
    console.log(`- Email: ${user.email}`);
    console.log(`- Password: admin123 (change this immediately!)`);
    console.log(`- User ID: ${user.id}`);
    console.log(`- Admin ID: ${admin.id}`);
    console.log('\n🔐 Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error seeding first admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedFirstAdmin(); 