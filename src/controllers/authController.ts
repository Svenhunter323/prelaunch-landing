import { Request, Response } from 'express';
import { User } from '../models/User';
import { signToken } from '../lib/jwt';
import { calculateNextChestAt, getCountdownSeconds } from '../lib/helpers';
import { AuthenticatedRequest } from '../middlewares/auth';
import { config } from '../config';
import { logger } from '../lib/logger';

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body as { token: string };

    // In a real implementation, you'd validate the token and mark email as verified
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    logger.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (email !== config.adminEmail || password !== config.adminPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({
      sub: 'admin',
      role: 'admin',
    });

    res.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const { user: authUser } = req as AuthenticatedRequest;
    
    const user = await User.findById(authUser.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const nextChestAt = calculateNextChestAt(user.lastChestOpenAt || null);
    const countdownSeconds = getCountdownSeconds(nextChestAt);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        referralCode: user.referralCode,
        claimCode: user.claimCode,
        totalCredits: user.totalCredits,
        telegramVerified: user.telegramVerified,
        emailVerified: user.emailVerified,
        nextChestAt: nextChestAt?.toISOString() || null,
        countdownSeconds,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}