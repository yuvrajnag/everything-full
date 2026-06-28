import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname.startsWith("/admin")) {
      const role = req.nextauth.token?.role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - api/proxy (Backend API proxy)
     * - login (the login page itself)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logos (public logo assets)
     * - products (public product image assets)
     * - stuff (public misc assets)
     */
    '/((?!api/auth|api/proxy|login|_next/static|_next/image|favicon.ico|logos|products|stuff).*)',
  ],
};
