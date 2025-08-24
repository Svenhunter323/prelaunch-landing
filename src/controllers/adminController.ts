import { Request, Response } from 'express';
import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { FraudLog } from '../models/FraudLog';
import { logger } from '../lib/logger';

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { cursor, limit, q } = req.query as { cursor?: string; limit: number; q?: string };

    const filter: Record<string, unknown> = {};
    if (cursor) {
      filter._id = { $lt: cursor };
    }
    if (q) {
      filter.$or = [
        { email: new RegExp(q, 'i') },
        { referralCode: new RegExp(q, 'i') },
      ];
    }

    const users = await User.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select('email referralCode claimCode totalCredits emailVerified telegramVerified createdAt');

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, -1) : users;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    res.json({
      success: true,
      data: {
        items,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReferrals(req: Request, res: Response): Promise<void> {
  try {
    const { cursor, limit, status } = req.query as { cursor?: string; limit: number; status?: string };

    const filter: Record<string, unknown> = {};
    if (cursor) {
      filter._id = { $lt: cursor };
    }
    if (status) {
      filter.status = status;
    }

    const referrals = await Referral.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('referrerId', 'email referralCode')
      .populate('referredUserId', 'email');

    const hasMore = referrals.length > limit;
    const items = hasMore ? referrals.slice(0, -1) : referrals;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    res.json({
      success: true,
      data: {
        items,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    logger.error('Get referrals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function exportClaimCodes(req: Request, res: Response): Promise<void> {
  try {
    const users = await User.find()
      .select('email claimCode totalCredits')
      .sort({ createdAt: 1 });

    const csv = [
      'email,claimCode,totalCredits',
      ...users.map(user => `${user.email},${user.claimCode},${user.totalCredits}`)
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="claim-codes.csv"');
    res.send(csv);
  } catch (error) {
    logger.error('Export claim codes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function flagUser(req: Request, res: Response): Promise<void> {
  try {
    const { userId, reason } = req.body as { userId: string; reason: string };

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await FraudLog.create({
      userId: user._id,
      type: 'ADMIN_FLAG',
      details: { reason },
    });

    res.json({
      success: true,
      message: 'User flagged successfully',
    });
  } catch (error) {
    logger.error('Flag user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}