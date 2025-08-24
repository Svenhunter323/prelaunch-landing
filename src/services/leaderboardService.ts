import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot';
import { maskEmail } from '../lib/helpers';
import { logger } from '../lib/logger';

export async function generateLeaderboardSnapshot(): Promise<void> {
  try {
    logger.info('Generating leaderboard snapshot...');

    // Get all users with their valid referral counts
    const pipeline = [
      {
        $lookup: {
          from: 'referrals',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$referrerId', '$$userId'] },
                    { $eq: ['$status', 'eligible'] }
                  ]
                }
              }
            }
          ],
          as: 'validReferrals'
        }
      },
      {
        $addFields: {
          validReferralCount: { $size: '$validReferrals' }
        }
      },
      {
        $match: {
          validReferralCount: { $gt: 0 }
        }
      },
      {
        $sort: {
          validReferralCount: -1,
          createdAt: 1
        }
      },
      {
        $limit: 100
      }
    ];

    const users = await User.aggregate(pipeline);

    const rows = users.map((user, index) => ({
      userId: user._id,
      maskedName: user.email.split('@')[0] || 'Anonymous',
      maskedEmail: maskEmail(user.email),
      validReferrals: user.validReferralCount,
      rank: index + 1,
      prize: getPrizeForRank(index + 1),
    }));

    // Save snapshot
    await LeaderboardSnapshot.create({ rows });

    // Clean up old snapshots (keep last 30)
    const oldSnapshots = await LeaderboardSnapshot.find()
      .sort({ createdAt: -1 })
      .skip(30);

    if (oldSnapshots.length > 0) {
      const oldIds = oldSnapshots.map(s => s._id);
      await LeaderboardSnapshot.deleteMany({ _id: { $in: oldIds } });
    }

    logger.info(`Leaderboard snapshot generated with ${rows.length} entries`);
  } catch (error) {
    logger.error('Failed to generate leaderboard snapshot:', error);
    throw error;
  }
}

function getPrizeForRank(rank: number): number {
  const prizes = [10000, 7500, 5000, 3500, 2000, 1000, 500, 250, 100, 50];
  return prizes[rank - 1] || 0;
}

export async function getLeaderboardTop10(): Promise<Array<{
  rank: number;
  maskedName: string;
  maskedEmail: string;
  validReferrals: number;
  prize: number;
}>> {
  const snapshot = await LeaderboardSnapshot.findOne().sort({ createdAt: -1 });
  
  if (!snapshot) {
    return [];
  }

  return snapshot.rows.slice(0, 10).map(row => ({
    rank: row.rank,
    maskedName: row.maskedName,
    maskedEmail: row.maskedEmail,
    validReferrals: row.validReferrals,
    prize: row.prize,
  }));
}