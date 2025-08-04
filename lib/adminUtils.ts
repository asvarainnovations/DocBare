import { prisma } from './prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const admin = await prisma.admin.findUnique({
      where: { 
        userId,
        active: true 
      }
    });
    return !!admin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get admin information for a user
 */
export async function getAdminInfo(userId: string) {
  try {
    const admin = await prisma.admin.findUnique({
      where: { 
        userId,
        active: true 
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
            image: true
          }
        }
      }
    });
    return admin;
  } catch (error) {
    console.error('Error getting admin info:', error);
    return null;
  }
}

/**
 * Check if current session user is an admin
 */
export async function checkAdminSession() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { isAdmin: false, admin: null, session: null };
    }

    const admin = await getAdminInfo(session.user.id);
    return {
      isAdmin: !!admin,
      admin,
      session
    };
  } catch (error) {
    console.error('Error checking admin session:', error);
    return { isAdmin: false, admin: null, session: null };
  }
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin() {
  const { isAdmin, admin, session } = await checkAdminSession();
  
  if (!isAdmin || !admin) {
    throw new Error('Admin access required');
  }
  
  return { admin, session };
}

/**
 * Generate a secure invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate admin invite code
 */
export async function validateInviteCode(code: string) {
  try {
    const invite = await prisma.adminInvite.findUnique({
      where: { code }
    });

    if (!invite) {
      return { valid: false, error: 'Invalid invite code' };
    }

    if (invite.redeemed) {
      return { valid: false, error: 'Invite code has already been used' };
    }

    if (invite.expiresAt < new Date()) {
      return { valid: false, error: 'Invite code has expired' };
    }

    return { valid: true, invite };
  } catch (error) {
    console.error('Error validating invite code:', error);
    return { valid: false, error: 'Failed to validate invite code' };
  }
} 