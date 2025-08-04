import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Find the invite
    const invite = await prisma.adminInvite.findUnique({
      where: { code },
      include: {
        invitedByAdmin: {
          include: {
            user: {
              select: {
                email: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    // Check if invite is already redeemed
    if (invite.redeemed) {
      return NextResponse.json(
        { error: 'Invite code has already been used' },
        { status: 400 }
      );
    }

    // Check if invite has expired
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite code has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invite: {
        code: invite.code,
        email: invite.email,
        expiresAt: invite.expiresAt.toISOString(),
        invitedBy: invite.invitedByAdmin?.user.email || 'System',
        createdAt: invite.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error validating admin invite:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite' },
      { status: 500 }
    );
  }
} 