import { Request, Response } from 'express';
import { User } from '../models/User';
import { ChestOpen } from '../models/ChestOpen';
import { Referral } from '../models/Referral';
import { drawChestReward } from '../lib/rng';
import { calculateNextChestAt } from '../lib/helpers';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logger } from '../lib/logger';
import mongoose from 'mongoose';

export async function openChest(req: Request, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { user: authUser } = req as AuthenticatedRequest;
      
      const user = await User.findById(authUser.id).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        res.status(403).json({ error: 'Email verification required' });
        return;
      }

      // Check if Telegram is verified
      if (!user.telegramVerified) {
        res.status(403).json({ error: 'Telegram verification required' });
        return;
      }

      // Check cooldown (24 hours)
      if (user.lastChestOpenAt) {
        const cooldownEnd = new Date(user.lastChestOpenAt.getTime() + 24 * 60 * 60 * 1000);
        if (new Date() < cooldownEnd) {
          res.status(429).json({ error: 'Chest cooldown active' });
          return;
        }
      }

      // Draw reward
      const isFirst = !user.firstChestOpened;
      const amount = drawChestReward(isFirst);

      // Update user
      user.totalCredits += amount;
      user.firstChestOpened = true;
      user.lastChestOpenAt = new Date();
      await user.save({ session });

      // Record chest open
      await ChestOpen.create([{
        userId: user._id,
        amount,
        source: isFirst ? 'first' : 'regular',
      }], { session });

      // Update referral status if this was first chest after telegram verification
      if (isFirst && user.telegramVerified) {
        await Referral.updateOne(
          { referredUserId: user._id, status: 'pending' },
          { status: 'eligible' },
          { session }
        );
      }

      const nextChestAt = calculateNextChestAt(user.lastChestOpenAt);

      res.json({
        success: true,
        data: {
          amount,
          totalCredits: user.totalCredits,
          nextChestAt: nextChestAt?.toISOString() || null,
        },
      });
    });
  } catch (error) {
    logger.error('Open chest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.endSession();
  }
}