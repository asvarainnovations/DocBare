import { prisma } from './prisma';

export interface CrossPlatformUser {
  id: string;
  email: string;
  fullName?: string;
  image?: string;
  platform: string;
  lastLoginAt: Date;
}

/**
 * Get user's cross-platform activity
 */
export async function getUserCrossPlatformActivity(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        image: true,
        updatedAt: true,
        createdAt: true,
        // Add platform-specific data here as needed
      }
    });

    if (!user) return null;

    return {
      ...user,
      platform: 'docbare',
      lastLoginAt: user.updatedAt
    } as CrossPlatformUser;
  } catch (error) {
    console.error('Error getting cross-platform user activity:', error);
    return null;
  }
}

/**
 * Check if user exists across platforms
 */
export async function checkUserExists(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true
      }
    });

    return user;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return null;
  }
}

/**
 * Get platform-specific user data
 */
export async function getPlatformUserData(userId: string) {
  try {
    // Get DocBare specific data
    const docbareData = await prisma.chatSession.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });

    const documentCount = await prisma.document.count({
      where: { userId }
    });

    return {
      platform: 'docbare',
      chatSessions: docbareData.length,
      totalMessages: docbareData.reduce((sum: any, session: any) => sum + session._count.messages, 0),
      documents: documentCount,
      lastActivity: docbareData[0]?.updatedAt || null
    };
  } catch (error) {
    console.error('Error getting platform user data:', error);
    return null;
  }
}
