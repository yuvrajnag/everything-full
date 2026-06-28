import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function ANY(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getServerSession(authOptions);
  
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const backendUrl = `${baseUrl}/${path}`;
  
  const headers = new Headers(req.headers);
  // Add authentication context for the backend
  if ((session?.user as any)?.id) {
    headers.set('x-user-id', (session?.user as any).id);
  }
  if ((session?.user as any)?.role) {
    headers.set('x-user-role', (session?.user as any).role as string);
  }
  
  // Protect against spoofing from outside by injecting an internal secret
  headers.set('x-internal-secret', process.env.INTERNAL_API_KEY || 'default-dev-secret');

  // NextRequest body can only be read once
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.text();
    } catch (e) {}
  }

  try {
    const backendReq = new Request(backendUrl, {
      method: req.method,
      headers,
      body: body || undefined,
      redirect: 'manual',
      cache: 'no-store'
    });

    const response = await fetch(backendReq, { cache: 'no-store' });
    
    // Safely parse the body as arrayBuffer to handle both JSON and binary, avoiding corrupted streams
    const responseBuffer = await response.arrayBuffer();
    
    const safeHeaders = new Headers();
    if (response.headers.has('content-type')) {
      safeHeaders.set('content-type', response.headers.get('content-type')!);
    }

    return new NextResponse(responseBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: safeHeaders
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Internal API Error" }, { status: 500 });
  }
}

export const GET = ANY;
export const POST = ANY;
export const PUT = ANY;
export const DELETE = ANY;
export const PATCH = ANY;
