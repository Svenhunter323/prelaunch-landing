import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { FraudLog } from '../models/FraudLog';
import { RequestWithContext } from './ipDevice';
import { logger } from '../lib/logger';

const MAX_SIGNUPS_PER_IP_PER_DAY = 5;
const MAX_SIGNUPS_PER_DEVICE_PER_DAY = 3;

export async function antiFraudOnSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { context } = req as RequestWithContext;
    const { email } = req.body as { email: string };

    // Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Check IP-based signup limits (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ipSignupCount = await User.countDocuments({
      ips: context.ip,
      createdAt: { $gte: oneDayAgo },
    });

    if (ipSignupCount >= MAX_SIGNUPS_PER_IP_PER_DAY) {
      await FraudLog.create({
        type: 'IP_LIMIT',
        details: {
          ip: context.ip,
          email,
          count: ipSignupCount,
        },
      });

      res.status(429).json({ error: 'Too many signups from this IP address' });
      return;
    }

    // Check device fingerprint limits if available
    if (context.deviceFingerprint) {
      const deviceSignupCount = await User.countDocuments({
        deviceFingerprints: context.deviceFingerprint,
        createdAt: { $gte: oneDayAgo },
      });

      if (deviceSignupCount >= MAX_SIGNUPS_PER_DEVICE_PER_DAY) {
        await FraudLog.create({
          type: 'DEVICE_LIMIT',
          details: {
            deviceFingerprint: context.deviceFingerprint,
            email,
            count: deviceSignupCount,
          },
        });

        res.status(429).json({ error: 'Too many signups from this device' });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Anti-fraud middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}