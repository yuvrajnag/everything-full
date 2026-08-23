import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Route guard (Next.js 16 renamed the `middleware` file convention to `proxy`).
 *
 * Routes that require a signed-in customer. Everything else — the homepage,
 * product pages, the cart, the standalone payment page — is public.
 *
 * The previous matcher required a session for the *entire* site, so a shopper
 * could not browse the catalogue without signing in first, and the UPI payment
 * link bounced to /login when opened on a phone.
 */
const PROTECTED_PREFIXES = ['/checkout', '/profile', '/track', '/cancel', '/admin'];

export default withAuth(
  function proxy(req) {
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const role = req.nextauth.token?.role;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        if (!PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
          return true;
        }
        return !!token?.id;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Run on every path except Next.js internals, the API routes (which do
     * their own auth) and static assets.
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|logos/|products/|stuff/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)',
  ],
};
