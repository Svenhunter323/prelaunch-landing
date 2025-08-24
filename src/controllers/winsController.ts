import { Request, Response } from 'express';
import { FakeWin } from '../models/FakeWin';
import { logger } from '../lib/logger';

export async function getLatestWins(req: Request, res: Response): Promise<void> {
  try {
    const { limit } = req.query as { limit: number };
    
    const wins = await FakeWin.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('username country amount createdAt');

    const data = wins.map(win => ({
      username: win.username,
      country: win.country,
      amount: win.amount,
      createdAt: win.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Get latest wins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}