import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { User } from '../models/User';
import { logger } from '../lib/logger';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: 'user' | 'admin';
  };
}

export async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // For admin tokens, skip user lookup
    if (payload.role === 'admin') {
      (req as AuthenticatedRequest).user = {
        id: payload.sub,
        role: 'admin',
      };
      next();
      return;
    }

    // For user tokens, verify user exists
    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      role: 'user',
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}