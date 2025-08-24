import request from 'supertest';
import express from 'express';
import { User } from '../models/User';
import { ChestOpen } from '../models/ChestOpen';
import { signToken } from '../lib/jwt';
import chestRoutes from '../routes/chest';
import { auth } from '../middlewares/auth';

const app = express();
app.use(express.json());
app.use('/chest', auth, chestRoutes);

describe('Chest Opening', () => {
  let user: any;
  let token: string;

  beforeEach(async () => {
    user = await User.create({
      email: 'test@example.com',
      referralCode: 'TEST123',
      claimCode: 'ZOGGY-TEST123',
      emailVerified: true,
      telegramVerified: true,
      ips: ['127.0.0.1'],
      deviceFingerprints: [],
    });

    token = signToken({ sub: user.id, role: 'user' });
  });

  describe('POST /chest/open', () => {
    it('should open chest successfully for verified user', async () => {
      const response = await request(app)
        .post('/chest/open')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBeGreaterThanOrEqual(0);
      expect(response.body.data.totalCredits).toBeGreaterThanOrEqual(0);
      expect(response.body.data.nextChestAt).toBeDefined();

      const updatedUser = await User.findById(user.id);
      expect(updatedUser?.firstChestOpened).toBe(true);
      expect(updatedUser?.lastChestOpenAt).toBeDefined();

      const chestOpen = await ChestOpen.findOne({ userId: user.id });
      expect(chestOpen).toBeTruthy();
      expect(chestOpen?.source).toBe('first');
    });

    it('should require email verification', async () => {
      user.emailVerified = false;
      await user.save();

      await request(app)
        .post('/chest/open')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should require telegram verification', async () => {
      user.telegramVerified = false;
      await user.save();

      await request(app)
        .post('/chest/open')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should enforce 24h cooldown', async () => {
      // First chest open
      await request(app)
        .post('/chest/open')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Immediate second attempt should fail
      await request(app)
        .post('/chest/open')
        .set('Authorization', `Bearer ${token}`)
        .expect(429);
    });

    it('should never give big wins (>$10)', async () => {
      const results: number[] = [];
      
      // Test first chest multiple times with different users
      for (let i = 0; i < 100; i++) {
        const testUser = await User.create({
          email: `test${i}@example.com`,
          referralCode: `TEST${i}`,
          claimCode: `ZOGGY-TEST${i}`,
          emailVerified: true,
          telegramVerified: true,
          ips: ['127.0.0.1'],
          deviceFingerprints: [],
        });

        const testToken = signToken({ sub: testUser.id, role: 'user' });

        const response = await request(app)
          .post('/chest/open')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);

        results.push(response.body.data.amount);
      }

      // Verify no amount exceeds $10
      const maxAmount = Math.max(...results);
      expect(maxAmount).toBeLessThanOrEqual(10);

      // Verify we get expected distribution for first chest (70% $0.10, 30% $0.20)
      const amounts010 = results.filter(a => Math.abs(a - 0.10) < 0.001).length;
      const amounts020 = results.filter(a => Math.abs(a - 0.20) < 0.001).length;
      
      // Allow some variance but should be roughly 70/30 split
      expect(amounts010).toBeGreaterThan(50); // Should be around 70
      expect(amounts020).toBeGreaterThan(20); // Should be around 30
    });

    it('should have different reward distribution for regular chests', async () => {
      // Set user as having opened first chest already
      user.firstChestOpened = true;
      user.lastChestOpenAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      await user.save();

      const response = await request(app)
        .post('/chest/open')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const chestOpen = await ChestOpen.findOne({ 
        userId: user.id,
        source: 'regular'
      });
      expect(chestOpen).toBeTruthy();
    });
  });
});