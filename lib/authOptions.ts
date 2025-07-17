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
  adapter.createUser = async (data: any) => {
    if (!data.passwordHash) {
      data.passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
    }
    return originalCreateUser(data);
  };
  return adapter;
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
        const user = await prisma.user.findUnique({ where: { email: credentials?.email } });
        if (user && user.passwordHash && credentials?.password) {
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (isValid) return user;
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Account linking logic that relied on session is removed due to NextAuth callback limitations.
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 