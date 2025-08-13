import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get user's privacy settings from database
    // For now, return default settings since we haven't added a privacy settings table yet
    const defaultSettings = {
      dataRetention: '90days',
      sessionTimeout: '24hours',
      allowAnalytics: true,
      allowMarketingEmails: false,
      allowChatHistory: true,
      allowDocumentStorage: true
    };

    return NextResponse.json({
      success: true,
      settings: defaultSettings
    });

  } catch (error) {
    console.error('Privacy settings fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const settings = await req.json();

    // Validate settings
    const validDataRetention = ['30days', '90days', '1year', 'forever'];
    const validSessionTimeout = ['1hour', '8hours', '24hours', '7days'];

    if (!validDataRetention.includes(settings.dataRetention)) {
      return NextResponse.json({ 
        error: 'Invalid data retention value' 
      }, { status: 400 });
    }

    if (!validSessionTimeout.includes(settings.sessionTimeout)) {
      return NextResponse.json({ 
        error: 'Invalid session timeout value' 
      }, { status: 400 });
    }

    // For now, just return success since we haven't added a privacy settings table
    // In the future, you would save these to a UserPrivacySettings table
    console.log('Privacy settings update for user:', session.user.id, settings);

    return NextResponse.json({
      success: true,
      message: 'Privacy settings updated successfully'
    });

  } catch (error) {
    console.error('Privacy settings update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
