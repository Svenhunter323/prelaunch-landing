import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { FraudLog } from '../models/FraudLog';

export async function updateReferralEligibility(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  // Check if user meets eligibility criteria
  const isEligible = user.emailVerified && 
                    user.telegramVerified && 
                    user.firstChestOpened;

  if (isEligible) {
    await Referral.updateOne(
      { referredUserId: userId, status: 'pending' },
      { status: 'eligible' }
    );
  }
}

export async function checkFraudPatterns(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  // Check for suspicious IP patterns
  if (user.ips.length > 1) {
    const referrals = await Referral.find({ referrerId: userId }).populate('referredUserId');
    const referredUsers = referrals.map(r => r.referredUserId) as any[];
    
    // Check if >30% of referrals share same IP
    const ipCounts: Record<string, number> = {};
    referredUsers.forEach(refUser => {
      refUser.ips.forEach((ip: string) => {
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;
      });
    });

    const totalReferrals = referredUsers.length;
    const suspiciousIps = Object.entries(ipCounts).filter(([, count]) => 
      count / totalReferrals > 0.3
    );

    if (suspiciousIps.length > 0) {
      await FraudLog.create({
        userId: user._id,
        type: 'SUSPICIOUS_PATTERN',
        details: {
          pattern: 'IP_CLUSTERING',
          suspiciousIps: suspiciousIps.map(([ip]) => ip),
          percentage: Math.max(...suspiciousIps.map(([, count]) => count / totalReferrals)),
        },
      });

      // Mark referrals as invalid
      await Referral.updateMany(
        { referrerId: userId },
        { status: 'invalid', reason: 'Suspicious IP pattern detected' }
      );
    }
  }
}