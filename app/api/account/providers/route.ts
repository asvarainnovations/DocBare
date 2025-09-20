import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get user's linked accounts
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: {
        provider: true
      }
    });

    const providers = accounts.map((account: any) => account.provider);

    return NextResponse.json({
      success: true,
      providers
    });

  } catch (error) {
    console.error('Providers fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
