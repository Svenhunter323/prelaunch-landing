import { Request, Response } from 'express';
import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { createReferralCode, createClaimCode } from '../lib/helpers';
import { signToken } from '../lib/jwt';
import { addToMailchimpList } from '../lib/mail';
import { RequestWithContext } from '../middlewares/ipDevice';
import { logger } from '../lib/logger';

export async function joinWaitlist(req: Request, res: Response): Promise<void> {
  try {
    const { email, ref } = req.body as { email: string; ref?: string };
    const { context } = req as RequestWithContext;

    // Generate codes
    const referralCode = createReferralCode();
    const claimCode = createClaimCode();

    // Create user
    const user = new User({
      email,
      referralCode,
      claimCode,
      referredBy: ref,
      ips: [context.ip],
      deviceFingerprints: context.deviceFingerprint ? [context.deviceFingerprint] : [],
    });

    await user.save();

    // Create referral record if referred
    if (ref) {
      const referrer = await User.findOne({ referralCode: ref });
      if (referrer) {
        await Referral.create({
          referrerId: referrer._id,
          referredUserId: user._id,
          status: 'pending',
        });
      }
    }

    // Add to Mailchimp (async, don't wait)
    addToMailchimpList(email, {
      REFCODE: referralCode,
      CLAIMCODE: claimCode,
    }).catch((error) => {
      logger.error('Failed to add to Mailchimp:', error);
    });

    // Generate JWT
    const token = signToken({
      sub: user.id,
      role: 'user',
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        referralCode,
        claimCode,
      },
      message: 'Successfully joined waitlist',
    });
  } catch (error) {
    logger.error('Join waitlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}