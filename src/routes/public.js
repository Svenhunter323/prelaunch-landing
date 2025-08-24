const express = require('express');
const router = express.Router();
const { sign, auth } = require('../middleware/auth');
const User = require('../models/User');
const ChestOpen = require('../models/ChestOpen');
const FakeWin = require('../models/FakeWin');
const { newReferralCode, newClaimCode, newEmailVerificationToken } = require('../utils/ids');
const { drawReward } = require('../services/rewards');
const { addToList } = require('../services/mailchimp');
const { sendVerificationEmail } = require('../services/email');
const cfg = require('../config');

// Anti-fraud helper
async function ipSignupCount(ip) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  return User.countDocuments({ signupIp: ip, createdAt: { $gte: since } });
}

// POST /api/waitlist
router.post('/waitlist', async (req, res) => {
  try {
    const { email, ref } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email_required' });

    // duplicate email block
    const existing = await User.findOne({ email });
    if (existing) {
      const token = sign(existing);
      return res.json({ token, referralCode: existing.referralCode });
    }

    // IP/device throttling
    const ip = req.ctx.ip;
    const count = await ipSignupCount(ip);
    if (count >= cfg.antifraud.maxPerIpPerDay) {
      return res.status(429).json({ error: 'too_many_signups_from_ip' });
    }

    const referralCode = newReferralCode();
    const claimCode = newClaimCode();
    const emailVerificationToken = newEmailVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let referredBy = (ref || '').trim();
    if (!cfg.antifraud.allowSelfRef && referredBy && referredBy === referralCode) {
      referredBy = ''; // prevent self-ref
    }

    const user = await User.create({
      email,
      referralCode,
      claimCode,
      referredBy,
      emailVerificationToken,
      emailVerificationExpires,
      signupIp: req.ctx.ip,
      signupUa: req.ctx.ua,
      deviceId: req.ctx.deviceId
    });

    // increment inviter referralCount
    if (referredBy) {
      await User.updateOne({ referralCode: referredBy }, { $inc: { referralCount: 1 } });
    }

    addToList(email).catch((e) => {
      console.error('[waitlist] Failed to add to Mailchimp:', e.message);
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, emailVerificationToken);
    } catch (error) {
      console.error('[waitlist] Failed to send verification email:', error.message);
      // Continue with signup even if email fails
    }

    const token = sign(user);
    res.json({ 
      token, 
      referralCode, 
      message: 'Please check your email to verify your account before accessing the dashboard.' 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/verify-email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'verification_token_required' });

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'invalid_or_expired_token' });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Email verified successfully! You can now access your dashboard.' 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/resend-verification
router.post('/resend-verification', auth, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.emailVerified) {
      return res.status(400).json({ error: 'email_already_verified' });
    }

    // Generate new verification token
    const emailVerificationToken = newEmailVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, emailVerificationToken);
      res.json({ message: 'Verification email sent successfully.' });
    } catch (error) {
      console.error('[resend-verification] Failed to send email:', error.message);
      res.status(500).json({ error: 'failed_to_send_email' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/dashboard
router.get('/dashboard', auth, async (req, res) => {
  const u = req.user;

  // Check if email is verified
  if (!u.emailVerified) {
    return res.status(403).json({ 
      error: 'email_not_verified',
      message: 'Please verify your email address before accessing the dashboard.'
    });
  }

  // position: rank by (referralCount desc, createdAt asc)
  const ahead = await User.countDocuments({
    $or: [
      { referralCount: { $gt: u.referralCount } },
      { referralCount: u.referralCount, createdAt: { $lt: u.createdAt } }
    ]
  });

  const total = await User.countDocuments();

  res.json({
    email: u.email,
    referralCode: u.referralCode,
    claimCode: u.claimCode,
    referrals: u.referralCount,
    position: ahead + 1,
    total,
    cents: u.cents,
    balance: (u.cents / 100).toFixed(2),
    telegram: { linked: !!u.telegramUserId, verified: !!u.telegramJoinedOk },
    emailVerified: u.emailVerified,
    lastOpenAt: u.lastOpenAt,
    openCount: u.openCount,
    cooldownSeconds: u.lastOpenAt ? Math.max(0, Math.floor(24 * 3600 - (Date.now() - u.lastOpenAt.getTime()) / 1000)) : 0
  });
});

// POST /api/open-chest
router.post('/open-chest', auth, async (req, res) => {
  const u = req.user;

  // Check if email is verified
  if (!u.emailVerified) {
    return res.status(403).json({ 
      error: 'email_not_verified',
      message: 'Please verify your email address before opening chests.'
    });
  }

  // Telegram gate
  if (!u.telegramJoinedOk) {
    return res.status(403).json({ error: 'telegram_required' });
  }

  // cooldown 24h
  if (u.lastOpenAt && Date.now() - u.lastOpenAt.getTime() < 24 * 3600 * 1000) {
    return res.status(429).json({ error: 'cooldown_active' });
  }

  const isFirst = !u.firstChestOpened;
  const cents = drawReward(isFirst);

  u.cents += cents;
  u.firstChestOpened = true;
  u.lastOpenAt = new Date();
  u.openCount += 1;
  await u.save();

  await ChestOpen.create({
    userId: u._id,
    amountCents: cents,
    isFirstChest: isFirst
  });

  res.json({ cents, amount: (cents / 100).toFixed(2) });
});

// GET /api/last-wins (bots only, newest first)
router.get('/last-wins', async (req, res) => {
  const items = await FakeWin.find().sort({ createdAt: -1 }).limit(50);
  res.json(items.map(i => ({
    username: i.username,
    amount: i.amount,
    at: i.createdAt
  })));
});

module.exports = router;
