import { Request, Response, NextFunction } from 'express';

export interface RequestWithContext extends Request {
  context: {
    ip: string;
    deviceFingerprint?: string;
  };
}

export function ipDevice(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
             req.connection.remoteAddress || 
             req.ip || 
             'unknown';
             
  const deviceFingerprint = req.headers['x-device-fp'] as string;

  (req as RequestWithContext).context = {
    ip,
    deviceFingerprint,
  };

  next();
}