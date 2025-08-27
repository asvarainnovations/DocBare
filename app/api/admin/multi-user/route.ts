import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// GET /api/admin/multi-user - List users with multi-user permissions (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause - show enterprise users with multi-user info
    const where: any = {
      role: 'ENTERPRISE'
    };
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          name: true,
          role: true,
          multiUser: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              managedUsers: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching multi-user users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/multi-user - Grant/revoke multi-user permission (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, multiUser, action } = body;

    if (!userId || typeof multiUser !== 'boolean') {
      return NextResponse.json({ error: 'userId and multiUser are required' }, { status: 400 });
    }

    // Check if target user exists and is enterprise
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        email: true,
        role: true,
        multiUser: true
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role !== 'ENTERPRISE') {
      return NextResponse.json({ error: 'Can only grant multi-user permissions to Enterprise users' }, { status: 400 });
    }

    // Update multi-user permission
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { multiUser },
      select: {
        id: true,
        email: true,
        fullName: true,
        name: true,
        role: true,
        multiUser: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.email,
        action: `Multi-user permission ${multiUser ? 'granted' : 'revoked'} for ${targetUser.email}`,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({ 
      user: updatedUser,
      message: `Multi-user permission ${multiUser ? 'granted' : 'revoked'} successfully`
    });

  } catch (error) {
    console.error('Error updating multi-user permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
