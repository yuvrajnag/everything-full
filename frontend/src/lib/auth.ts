import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db';

/**
 * NextAuth configuration.
 *
 * Kept out of `app/api/auth/[...nextauth]/route.ts` on purpose: App Router
 * route modules may only export route handlers and a fixed set of config
 * options, so exporting `authOptions` from there fails the route type check.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in the adapter hands us the database user.
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'CUSTOMER';
        return token;
      }

      // On every later call (including silent token refreshes) `user` is
      // undefined. The id must survive, because the backend identifies the
      // customer solely by `x-user-id` — a token without it would make every
      // authenticated request fail with 401 while the UI still looked signed in.
      if (!token.id && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } catch (e) {
          console.error('[auth] Could not recover user id from email', e);
        }
        return token;
      }

      // Refresh the role periodically so a promotion/demotion takes effect
      // without forcing a sign-out, but don't hit the database on every request.
      const lastCheck = typeof token.roleCheckedAt === 'number' ? token.roleCheckedAt : 0;
      const STALE_AFTER_MS = 5 * 60 * 1000;
      if (token.id && Date.now() - lastCheck > STALE_AFTER_MS) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.roleCheckedAt = Date.now();
          } else {
            // The account was deleted — drop the identity so the session
            // stops authorising backend calls.
            delete token.id;
            delete token.role;
          }
        } catch (e) {
          // A transient database blip must not sign the customer out.
          console.error('[auth] Could not refresh user role', e);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id ?? null;
        (session.user as any).role = token.role ?? 'CUSTOMER';
      }
      return session;
    },
  },
};
