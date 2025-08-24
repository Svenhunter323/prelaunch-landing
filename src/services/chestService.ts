import { User } from '../models/User';
import { ChestOpen } from '../models/ChestOpen';
import { drawChestReward } from '../lib/rng';
import mongoose from 'mongoose';

export interface ChestOpenResult {
  amount: number;
  totalCredits: number;
  nextChestAt: Date;
}

export async function openUserChest(userId: string): Promise<ChestOpenResult> {
  const session = await mongoose.startSession();
  
  return session.withTransaction(async () => {
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    // Validation checks
    if (!user.emailVerified) {
      throw new Error('Email verification required');
    }

    if (!user.telegramVerified) {
      throw new Error('Telegram verification required');
    }

    // Check cooldown
    if (user.lastChestOpenAt) {
      const cooldownEnd = new Date(user.lastChestOpenAt.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() < cooldownEnd) {
        throw new Error('Chest cooldown active');
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

    const nextChestAt = new Date(user.lastChestOpenAt.getTime() + 24 * 60 * 60 * 1000);

    return {
      amount,
      totalCredits: user.totalCredits,
      nextChestAt,
    };
  }).finally(() => session.endSession());
}

export async function getUserChestStats(userId: string): Promise<{
  totalOpened: number;
  totalEarned: number;
  lastOpenAt: Date | null;
  nextChestAt: Date | null;
}> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const chestOpens = await ChestOpen.find({ userId }).sort({ createdAt: -1 });
  const totalOpened = chestOpens.length;
  const totalEarned = chestOpens.reduce((sum, chest) => sum + chest.amount, 0);
  
  const nextChestAt = user.lastChestOpenAt 
    ? new Date(user.lastChestOpenAt.getTime() + 24 * 60 * 60 * 1000)
    : null;

  return {
    totalOpened,
    totalEarned,
    lastOpenAt: user.lastChestOpenAt || null,
    nextChestAt,
  };
}