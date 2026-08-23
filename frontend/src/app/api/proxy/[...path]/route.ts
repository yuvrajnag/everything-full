import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Headers forwarded from the browser to the Express backend.
 *
 * This is an allow-list rather than a copy of the incoming headers. The old
 * implementation passed `new Headers(req.headers)` straight through, which
 * meant a visitor could send their own `x-user-id` / `x-user-role` and have the
 * backend trust it — reading and cancelling anyone's orders, as an admin if
 * they liked. Identity now comes *only* from the server-side session below.
 */
const FORWARDED_HEADERS = ['content-type', 'accept', 'x-idempotency-key'] as const;

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;

  // Reject traversal attempts before they reach the backend.
  if (!Array.isArray(path) || path.some((p) => !p || p === '.' || p === '..' || p.includes('/'))) {
    return NextResponse.json({ error: 'Invalid API path' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const target = new URL(`${baseUrl.replace(/\/+$/, '')}/${path.join('/')}`);
  // Preserve query strings (e.g. filters, pagination).
  target.search = req.nextUrl.search;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Identity, established server-side. Never read from the incoming request.
  if (typeof userId === 'string' && userId) {
    headers.set('x-user-id', userId);
    headers.set('x-user-role', typeof role === 'string' && role ? role : 'CUSTOMER');
  }

  // Proves to the backend that this request came through the proxy.
  headers.set('x-internal-secret', process.env.INTERNAL_API_KEY || 'default-dev-secret');

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.text();
    } catch {
      return NextResponse.json({ error: 'Could not read the request body.' }, { status: 400 });
    }
  }

  try {
    const response = await fetch(target, {
      method: req.method,
      headers,
      ...(body ? { body } : {}),
      redirect: 'manual',
      cache: 'no-store',
      // Don't let a hung backend hold a serverless function open indefinitely.
      signal: AbortSignal.timeout(30_000),
    });

    const buffer = await response.arrayBuffer();

    const safeHeaders = new Headers();
    const contentType = response.headers.get('content-type');
    if (contentType) safeHeaders.set('content-type', contentType);
    safeHeaders.set('cache-control', 'no-store');

    return new NextResponse(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: safeHeaders,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.error('[proxy] Backend request failed:', error);
    return NextResponse.json(
      {
        error: timedOut
          ? 'The store is taking too long to respond. Please try again.'
          : 'We could not reach the store right now. Please try again in a moment.',
        code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
