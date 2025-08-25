import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import type { AuthOptions } from 'next-auth';
import { PrismaClient } from '@prisma/client';

// Monkey-patch PrismaAdapter to always provide a dummy passwordHash for OAuth users
function PatchedPrismaAdapter(prisma: PrismaClient) {
  const adapter = PrismaAdapter(prisma);
  const originalCreateUser = adapter.createUser;
  if (!originalCreateUser) {
    throw new Error('Prisma adapter createUser method not found');
  }
  adapter.createUser = async (data: any) => {
    if (!data.passwordHash) {
      data.passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
    }
    const result = await originalCreateUser(data);
    if (!result) {
      throw new Error('Failed to create user');
    }
    return result;
  };
  return adapter;
}

// Input validation for credentials
function validateCredentials(credentials: any) {
  if (!credentials?.email || !credentials?.password) {
    return { valid: false, error: 'Email and password are required' };
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(credentials.email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Password validation (minimum 8 characters)
  if (credentials.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  
  return { valid: true };
}

export const authOptions: AuthOptions = {
  adapter: PatchedPrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate input
          const validation = validateCredentials(credentials);
          if (!validation.valid) {
            console.warn('Invalid credentials format:', validation.error);
            return null;
          }

          const user = await prisma.user.findUnique({ 
            where: { email: credentials?.email },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              isActive: true,
              role: true
            }
          });

          // Check if user exists and is active
          if (!user || !user.isActive) {
            return null;
          }

          // Verify password
          if (user.passwordHash && credentials?.password) {
            const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
            if (isValid) {
              return {
                id: user.id,
                email: user.email,
                role: user.role
              };
            }
          }
          
          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days - reduced from 30 days for security
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Silent cross-platform authentication - no UI indicators
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        token.picture = user.image || ((profile as any)?.picture);
        token.platform = 'docbare'; // Add platform identifier
        
        // Check if user is an admin and add to token
        try {
          const admin = await prisma.admin.findUnique({
            where: { 
              userId: user.id,
              active: true 
            }
          });
          token.isAdmin = !!admin;
          if (admin) {
            token.adminId = admin.id;
          }
        } catch (error) {
          console.error('Error checking admin status in JWT callback:', error);
          token.isAdmin = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
        session.user.image = token.picture;
        session.user.platform = token.platform as string;
        // Add admin status from token to session
        session.user.isAdmin = token.isAdmin as boolean;
        if (token.adminId) {
          session.user.adminId = token.adminId as string;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Enable cross-platform cookies with enhanced security
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      }
    }
  }
}; 