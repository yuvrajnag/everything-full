import { Request, Response, NextFunction } from 'express';

export const requireInternalSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== (process.env.INTERNAL_API_KEY || 'default-dev-secret')) {
    // If someone calls the backend directly, we reject them unless it's a public route.
    return res.status(403).json({ error: 'Direct access forbidden' });
  }
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Optional: check role
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = req.headers['x-user-role'] as string;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
