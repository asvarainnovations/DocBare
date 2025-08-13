import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { checkUserExists, getPlatformUserData } from '@/lib/crossPlatformAuth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get platform-specific data for the user
    const platformData = await getPlatformUserData(session.user.id);
    
    if (!platformData) {
      return NextResponse.json({ 
        error: 'Failed to get platform data' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        platform: session.user.platform || 'docbare'
      },
      platformData,
      message: 'Cross-platform authentication successful'
    });

  } catch (error) {
    console.error('Cross-platform auth error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 });
    }

    // Check if user exists across platforms
    const user = await checkUserExists(email);
    
    if (!user) {
      return NextResponse.json({ 
        exists: false,
        message: 'User not found across platforms'
      });
    }

    return NextResponse.json({
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      message: 'User exists across platforms'
    });

  } catch (error) {
    console.error('Cross-platform user check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
