import { Request, Response } from 'express';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot';
import { logger } from '../lib/logger';

const PRIZES = [10000, 7500, 5000, 3500, 2000, 1000, 500, 250, 100, 50];

export async function getTop10(req: Request, res: Response): Promise<void> {
  try {
    // Get latest snapshot
    const snapshot = await LeaderboardSnapshot.findOne().sort({ createdAt: -1 });
    
    if (!snapshot || snapshot.rows.length === 0) {
      res.json({
        success: true,
        data: [],
      });
      return;
    }

    // Take top 10 and add prizes
    const top10 = snapshot.rows.slice(0, 10).map((row, index) => ({
      rank: index + 1,
      maskedName: row.maskedName,
      maskedEmail: row.maskedEmail,
      validReferrals: row.validReferrals,
      prize: PRIZES[index] || 0,
    }));

    res.json({
      success: true,
      data: top10,
    });
  } catch (error) {
    logger.error('Get top10 error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}