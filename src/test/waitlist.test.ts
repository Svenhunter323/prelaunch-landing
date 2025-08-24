import request from 'supertest';
import express from 'express';
import { User } from '../models/User';
import { Referral } from '../models/Referral';
import waitlistRoutes from '../routes/waitlist';
import { ipDevice } from '../middlewares/ipDevice';

const app = express();
app.use(express.json());
app.use(ipDevice);
app.use('/waitlist', waitlistRoutes);

describe('Waitlist', () => {
  describe('POST /waitlist', () => {
    it('should create a new user successfully', async () => {
      const response = await request(app)
        .post('/waitlist')
        .send({ email: 'test@example.com' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.referralCode).toBeDefined();
      expect(response.body.data.claimCode).toBeDefined();

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
      expect(user?.referralCode).toBe(response.body.data.referralCode);
    });

    it('should prevent duplicate emails', async () => {
      // Create first user
      await request(app)
        .post('/waitlist')
        .send({ email: 'test@example.com' })
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/waitlist')
        .send({ email: 'test@example.com' })
        .expect(409);
    });

    it('should create referral when ref code provided', async () => {
      // Create referrer
      const referrerResponse = await request(app)
        .post('/waitlist')
        .send({ email: 'referrer@example.com' })
        .expect(201);

      const referralCode = referrerResponse.body.data.referralCode;

      // Create referred user
      await request(app)
        .post('/waitlist')
        .send({ 
          email: 'referred@example.com',
          ref: referralCode 
        })
        .expect(201);

      const referral = await Referral.findOne().populate('referrerId referredUserId');
      expect(referral).toBeTruthy();
      expect((referral?.referrerId as any).email).toBe('referrer@example.com');
      expect((referral?.referredUserId as any).email).toBe('referred@example.com');
    });

    it('should validate email format', async () => {
      await request(app)
        .post('/waitlist')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should store IP and device fingerprint', async () => {
      await request(app)
        .post('/waitlist')
        .send({ email: 'test@example.com' })
        .set('x-device-fp', 'test-fingerprint')
        .expect(201);

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user?.ips).toContain('::ffff:127.0.0.1');
      expect(user?.deviceFingerprints).toContain('test-fingerprint');
    });
  });
});