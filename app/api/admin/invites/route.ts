import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, generateInviteCode } from '@/lib/adminUtils';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// Helper function to add hours to current time
function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    // Check admin access
    const { admin } = await requireAdmin();

    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists and is an admin
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { admin: true }
    });

    if (existingUser?.admin) {
      return NextResponse.json(
        { error: 'User is already an admin' },
        { status: 400 }
      );
    }

    // Generate invite code
    const code = generateInviteCode();
    const expiresAt = addHours(new Date(), 24); // 24 hours from now

    // Create invite
    const invite = await prisma.adminInvite.create({
      data: {
        code,
        email,
        invitedBy: admin.id,
        expiresAt
      }
    });

    console.info('🟩 [admin_invite][SUCCESS] Admin invite created:', { 
      code, 
      email, 
      invitedBy: admin.user?.email || 'Unknown',
      expiresAt 
    });

    // In a real implementation, you would send an email here
    // For now, we'll return the invite URL
    const inviteUrl = `${req.nextUrl.origin}/admin/signup?invite=${code}`;

    return NextResponse.json({
      success: true,
      invite: {
        code,
        email,
        expiresAt: expiresAt.toISOString(),
        inviteUrl
      }
    });

  } catch (error) {
    console.error('🟥 [admin_invite][ERROR] Failed to create admin invite:', error);
    return NextResponse.json(
      { error: 'Failed to create admin invite' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    // Get all pending invites
    const invites = await prisma.adminInvite.findMany({
      where: {
        redeemed: false,
        expiresAt: {
          gt: new Date()
        }
      },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      invites: invites.map((invite: any) => ({
        code: invite.code,
        email: invite.email,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt.toISOString(),
        invitedBy: invite.invitedByAdmin?.user.email || 'System'
      }))
    });

  } catch (error) {
    console.error('🟥 [admin_invite][ERROR] Failed to fetch admin invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin invites' },
      { status: 500 }
    );
  }
} 