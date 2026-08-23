import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * The backend is only ever reached through the Next.js proxy, which injects a
 * shared secret. Any request without it is a direct hit from the internet.
 */
export const requireInternalSecret = (req: Request, res: Response, next: NextFunction): void => {
  const provided = req.headers['x-internal-secret'];
  if (typeof provided !== 'string' || !constantTimeEquals(provided, env.internalApiKey)) {
    res.status(403).json({ error: 'Direct access forbidden', code: 'FORBIDDEN' });
    return;
  }
  next();
};

/**
 * Identity established by the proxy from the NextAuth session. The proxy strips
 * any client-supplied `x-user-*` headers before setting these, so they can be
 * trusted here.
 */
export interface AuthContext {
  userId: string | null;
  role: string;
  isAdmin: boolean;
}

export const getAuthContext = (req: Request): AuthContext => {
  const userIdHeader = req.headers['x-user-id'];
  const roleHeader = req.headers['x-user-role'];

  const userId = typeof userIdHeader === 'string' && userIdHeader.trim() ? userIdHeader.trim() : null;
  const role = typeof roleHeader === 'string' ? roleHeader.trim() : '';

  return {
    userId,
    role,
    isAdmin: role === 'ADMIN' || role === 'SUPER_ADMIN',
  };
};

/** Rejects requests that carry no signed-in user. */
export const requireUser = (req: Request, res: Response, next: NextFunction): void => {
  const { userId } = getAuthContext(req);
  if (!userId) {
    res.status(401).json({
      error: 'Please sign in to continue.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const { isAdmin } = getAuthContext(req);
  if (!isAdmin) {
    res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    return;
  }
  next();
};

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
