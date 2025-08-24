import request from 'supertest';
import express from 'express';
import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot';
import leaderboardRoutes from '../routes/leaderboard';

const app = express();
app.use(express.json());
app.use('/leaderboard', leaderboardRoutes);

describe('Leaderboard', () => {
  beforeEach(async () => {
    // Create test users with referrals
    const user1 = await User.create({
      email: 'user1@example.com',
      referralCode: 'USER1',
      claimCode: 'ZOGGY-USER1',
      ips: ['127.0.0.1'],
      deviceFingerprints: [],
    });

    const user2 = await User.create({
      email: 'user2@example.com',
      referralCode: 'USER2',
      claimCode: 'ZOGGY-USER2',
      ips: ['127.0.0.2'],
      deviceFingerprints: [],
    });

    // Create some referred users
    const referred1 = await User.create({
      email: 'referred1@example.com',
      referralCode: 'REF1',
      claimCode: 'ZOGGY-REF1',
      ips: ['127.0.0.3'],
      deviceFingerprints: [],
    });

    const referred2 = await User.create({
      email: 'referred2@example.com',
      referralCode: 'REF2',
      claimCode: 'ZOGGY-REF2',
      ips: ['127.0.0.4'],
      deviceFingerprints: [],
    });

    // Create referrals
    await Referral.create({
      referrerId: user1._id,
      referredUserId: referred1._id,
      status: 'eligible',
    });

    await Referral.create({
      referrerId: user1._id,
      referredUserId: referred2._id,
      status: 'eligible',
    });

    await Referral.create({
      referrerId: user2._id,
      referredUserId: referred1._id,
      status: 'eligible',
    });

    // Create leaderboard snapshot
    await LeaderboardSnapshot.create({
      rows: [
        {
          userId: user1._id,
          maskedName: 'u***1',
          maskedEmail: 'u***1@example.com',
          validReferrals: 2,
          rank: 1,
          prize: 10000,
        },
        {
          userId: user2._id,
          maskedName: 'u***2',
          maskedEmail: 'u***2@example.com',
          validReferrals: 1,
          rank: 2,
          prize: 7500,
        },
      ],
    });
  });

  describe('GET /leaderboard/top10', () => {
    it('should return top 10 leaderboard entries', async () => {
      const response = await request(app)
        .get('/leaderboard/top10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      const first = response.body.data[0];
      expect(first.rank).toBe(1);
      expect(first.validReferrals).toBe(2);
      expect(first.prize).toBe(10000);
      expect(first.maskedEmail).toContain('*');
    });

    it('should return empty array when no snapshot exists', async () => {
      await LeaderboardSnapshot.deleteMany({});

      const response = await request(app)
        .get('/leaderboard/top10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should assign correct prizes to ranks', async () => {
      const response = await request(app)
        .get('/leaderboard/top10')
        .expect(200);

      const entries = response.body.data;
      expect(entries[0].prize).toBe(10000); // 1st place
      expect(entries[1].prize).toBe(7500);  // 2nd place
    });
  });
});