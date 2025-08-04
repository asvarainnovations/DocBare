import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { inviteCode, email, fullName, password } = await req.json();

    if (!inviteCode || !email || !fullName || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate invite code
    const invite = await prisma.adminInvite.findUnique({
      where: { code: inviteCode }
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    if (invite.redeemed) {
      return NextResponse.json(
        { error: 'Invite code has already been used' },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite code has expired' },
        { status: 400 }
      );
    }

    if (invite.email !== email) {
      return NextResponse.json(
        { error: 'Email must match the invited email address' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create or update user
      const user = await tx.user.upsert({
        where: { email },
        update: {
          fullName,
          passwordHash: hashedPassword,
          name: fullName
        },
        create: {
          email,
          fullName,
          passwordHash: hashedPassword,
          name: fullName
        }
      });

      // Create admin record
      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          createdBy: invite.invitedBy
        }
      });

      // Mark invite as redeemed
      await tx.adminInvite.update({
        where: { code: inviteCode },
        data: {
          redeemed: true,
          redeemedAt: new Date()
        }
      });

      return { user, admin };
    });

    console.info('🟩 [admin_signup][SUCCESS] Admin account created:', {
      userId: result.user.id,
      email: result.user.email,
      adminId: result.admin.id
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully'
    });

  } catch (error) {
    console.error('🟥 [admin_signup][ERROR] Failed to create admin account:', error);
    return NextResponse.json(
      { error: 'Failed to create admin account' },
      { status: 500 }
    );
  }
} 