import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { FraudLog } from '../models/FraudLog';

export async function getValidReferralCount(userId: string): Promise<number> {
  return Referral.countDocuments({
    referrerId: userId,
    status: 'eligible',
  });
}

export async function getReferralStats(userId: string): Promise<{
  total: number;
  pending: number;
  eligible: number;
  invalid: number;
}> {
  const stats = await Referral.aggregate([
    { $match: { referrerId: userId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const result = {
    total: 0,
    pending: 0,
    eligible: 0,
    invalid: 0,
  };

  stats.forEach(stat => {
    result[stat._id as keyof typeof result] = stat.count;
    result.total += stat.count;
  });

  return result;
}

export async function validateReferralEligibility(): Promise<void> {
  // Get all pending referrals
  const pendingReferrals = await Referral.find({ status: 'pending' })
    .populate('referredUserId');

  for (const referral of pendingReferrals) {
    const user = referral.referredUserId as any;
    
    // Check eligibility criteria
    const isEligible = user.emailVerified && 
                      user.telegramVerified && 
                      user.firstChestOpened;

    if (isEligible) {
      // Additional fraud checks
      const fraudCheck = await checkReferralFraud(referral.referrerId, user._id);
      
      if (fraudCheck.isValid) {
        referral.status = 'eligible';
      } else {
        referral.status = 'invalid';
        referral.reason = fraudCheck.reason;
        
        // Log fraud
        await FraudLog.create({
          userId: referral.referrerId,
          type: 'SUSPICIOUS_PATTERN',
          details: fraudCheck.details,
        });
      }
      
      await referral.save();
    }
  }
}

async function checkReferralFraud(referrerId: string, referredUserId: string): Promise<{
  isValid: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}> {
  const referrer = await User.findById(referrerId);
  const referred = await User.findById(referredUserId);
  
  if (!referrer || !referred) {
    return { isValid: false, reason: 'User not found' };
  }

  // Check IP overlap
  const sharedIps = referrer.ips.filter(ip => referred.ips.includes(ip));
  if (sharedIps.length > 0) {
    return {
      isValid: false,
      reason: 'Shared IP address detected',
      details: { sharedIps },
    };
  }

  // Check device fingerprint overlap
  const sharedDevices = referrer.deviceFingerprints.filter(fp => 
    referred.deviceFingerprints.includes(fp)
  );
  if (sharedDevices.length > 0) {
    return {
      isValid: false,
      reason: 'Shared device fingerprint detected',
      details: { sharedDevices },
    };
  }

  // Check for too many referrals from same IP subnet
  const referrals = await Referral.find({ referrerId }).populate('referredUserId');
  const referredUsers = referrals.map(r => r.referredUserId) as any[];
  
  const ipSubnets: Record<string, number> = {};
  referredUsers.forEach(user => {
    user.ips.forEach((ip: string) => {
      const subnet = ip.split('.').slice(0, 3).join('.');
      ipSubnets[subnet] = (ipSubnets[subnet] || 0) + 1;
    });
  });

  const maxFromSameSubnet = Math.max(...Object.values(ipSubnets));
  if (maxFromSameSubnet > 3) {
    return {
      isValid: false,
      reason: 'Too many referrals from same IP subnet',
      details: { maxFromSameSubnet, ipSubnets },
    };
  }

  return { isValid: true };
}