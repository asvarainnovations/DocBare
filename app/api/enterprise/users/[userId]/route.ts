import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// PUT /api/enterprise/users/[userId] - Update team member (Enterprise users only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is enterprise with multi-user permission
    const enterpriseUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        role: true, 
        multiUser: true 
      }
    });

    if (!enterpriseUser || enterpriseUser.role !== 'ENTERPRISE' || !enterpriseUser.multiUser) {
      return NextResponse.json({ error: 'Forbidden - Enterprise multi-user access required' }, { status: 403 });
    }

    const { userId } = params;
    const body = await request.json();
    const { fullName, isActive } = body;

    // Verify the user is managed by this enterprise user
    const managedUser = await prisma.user.findFirst({
      where: {
        id: userId,
        managedById: enterpriseUser.id
      }
    });

    if (!managedUser) {
      return NextResponse.json({ error: 'User not found or not managed by you' }, { status: 404 });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName, name: fullName }),
        ...(typeof isActive === 'boolean' && { isActive })
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/enterprise/users/[userId] - Delete team member (Enterprise users only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is enterprise with multi-user permission
    const enterpriseUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        role: true, 
        multiUser: true 
      }
    });

    if (!enterpriseUser || enterpriseUser.role !== 'ENTERPRISE' || !enterpriseUser.multiUser) {
      return NextResponse.json({ error: 'Forbidden - Enterprise multi-user access required' }, { status: 403 });
    }

    const { userId } = params;

    // Verify the user is managed by this enterprise user
    const managedUser = await prisma.user.findFirst({
      where: {
        id: userId,
        managedById: enterpriseUser.id
      }
    });

    if (!managedUser) {
      return NextResponse.json({ error: 'User not found or not managed by you' }, { status: 404 });
    }

    // Soft delete the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
