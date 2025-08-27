import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/enterprise/users - List managed users (Enterprise users only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is enterprise with multi-user permission
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        role: true, 
        multiUser: true 
      }
    });

    if (!user || user.role !== 'ENTERPRISE' || !user.multiUser) {
      return NextResponse.json({ error: 'Forbidden - Enterprise multi-user access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause - only show users managed by this enterprise user
    const where: any = {
      managedById: user.id
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
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              chatSessions: true,
              pleadsmartChatSessions: true
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
    console.error('Error fetching managed users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/enterprise/users - Create new team member (Enterprise users only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is enterprise with multi-user permission
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        role: true, 
        multiUser: true 
      }
    });

    if (!user || user.role !== 'ENTERPRISE' || !user.multiUser) {
      return NextResponse.json({ error: 'Forbidden - Enterprise multi-user access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, fullName, role = 'USER' } = body;

    // Validate required fields
    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email and fullName are required' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Validate role - Enterprise users can only create USER roles
    if (role !== 'USER') {
      return NextResponse.json({ error: 'Enterprise users can only create USER accounts' }, { status: 400 });
    }

    // Create user under this enterprise user's management
    const newUser = await prisma.user.create({
      data: {
        email,
        fullName,
        name: fullName,
        role: 'USER',
        managedById: user.id, // Set this enterprise user as the manager
        passwordHash: 'temp-password-hash', // Will be set during first login
        isActive: true
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    return NextResponse.json({ user: newUser }, { status: 201 });

  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
