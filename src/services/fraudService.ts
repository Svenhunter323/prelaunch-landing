import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { FraudLog } from '../models/FraudLog';
import { logger } from '../lib/logger';

export async function runFraudDetection(): Promise<void> {
  logger.info('Running fraud detection...');

  try {
    await detectIPClustering();
    await detectDeviceClustering();
    await detectSuspiciousPatterns();
    
    logger.info('Fraud detection completed');
  } catch (error) {
    logger.error('Fraud detection failed:', error);
    throw error;
  }
}

async function detectIPClustering(): Promise<void> {
  // Find users with referrals
  const usersWithReferrals = await User.find().populate({
    path: 'referrals',
    match: { status: { $in: ['pending', 'eligible'] } }
  });

  for (const user of usersWithReferrals) {
    const referrals = await Referral.find({ referrerId: user._id })
      .populate('referredUserId');

    if (referrals.length < 3) continue; // Skip users with few referrals

    const referredUsers = referrals.map(r => r.referredUserId) as any[];
    const ipCounts: Record<string, number> = {};

    // Count IPs across all referred users
    referredUsers.forEach(refUser => {
      refUser.ips.forEach((ip: string) => {
        const subnet = ip.split('.').slice(0, 3).join('.');
        ipCounts[subnet] = (ipCounts[subnet] || 0) + 1;
      });
    });

    // Check for clustering (>30% from same subnet)
    const totalReferrals = referredUsers.length;
    const suspiciousSubnets = Object.entries(ipCounts).filter(([, count]) => 
      count / totalReferrals > 0.3 && count > 2
    );

    if (suspiciousSubnets.length > 0) {
      await FraudLog.create({
        userId: user._id,
        type: 'SUSPICIOUS_PATTERN',
        details: {
          pattern: 'IP_CLUSTERING',
          suspiciousSubnets: suspiciousSubnets.map(([subnet, count]) => ({
            subnet,
            count,
            percentage: count / totalReferrals
          })),
          totalReferrals,
        },
      });

      // Mark affected referrals as invalid
      const affectedReferrals = referrals.filter(r => {
        const refUser = r.referredUserId as any;
        return refUser.ips.some((ip: string) => {
          const subnet = ip.split('.').slice(0, 3).join('.');
          return suspiciousSubnets.some(([suspiciousSubnet]) => suspiciousSubnet === subnet);
        });
      });

      await Referral.updateMany(
        { _id: { $in: affectedReferrals.map(r => r._id) } },
        { 
          status: 'invalid', 
          reason: 'IP clustering detected' 
        }
      );

      logger.warn(`IP clustering detected for user ${user.email}, ${affectedReferrals.length} referrals invalidated`);
    }
  }
}

async function detectDeviceClustering(): Promise<void> {
  const usersWithReferrals = await User.find().populate({
    path: 'referrals',
    match: { status: { $in: ['pending', 'eligible'] } }
  });

  for (const user of usersWithReferrals) {
    const referrals = await Referral.find({ referrerId: user._id })
      .populate('referredUserId');

    if (referrals.length < 3) continue;

    const referredUsers = referrals.map(r => r.referredUserId) as any[];
    const deviceCounts: Record<string, number> = {};

    // Count device fingerprints
    referredUsers.forEach(refUser => {
      refUser.deviceFingerprints.forEach((fp: string) => {
        deviceCounts[fp] = (deviceCounts[fp] || 0) + 1;
      });
    });

    // Check for clustering (>20% from same device)
    const totalReferrals = referredUsers.length;
    const suspiciousDevices = Object.entries(deviceCounts).filter(([, count]) => 
      count / totalReferrals > 0.2 && count > 1
    );

    if (suspiciousDevices.length > 0) {
      await FraudLog.create({
        userId: user._id,
        type: 'SUSPICIOUS_PATTERN',
        details: {
          pattern: 'DEVICE_CLUSTERING',
          suspiciousDevices: suspiciousDevices.map(([device, count]) => ({
            device: device.substring(0, 8) + '...', // Partial for privacy
            count,
            percentage: count / totalReferrals
          })),
          totalReferrals,
        },
      });

      logger.warn(`Device clustering detected for user ${user.email}`);
    }
  }
}

async function detectSuspiciousPatterns(): Promise<void> {
  // Detect rapid signups from same IP
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const ipSignups = await User.aggregate([
    { $match: { createdAt: { $gte: oneDayAgo } } },
    { $unwind: '$ips' },
    { $group: { _id: '$ips', count: { $sum: 1 }, users: { $push: '$_id' } } },
    { $match: { count: { $gte: 5 } } }
  ]);

  for (const ipGroup of ipSignups) {
    await FraudLog.create({
      type: 'IP_LIMIT',
      details: {
        ip: ipGroup._id,
        signupCount: ipGroup.count,
        timeframe: '24h',
        userIds: ipGroup.users,
      },
    });

    logger.warn(`Suspicious IP activity: ${ipGroup.count} signups from ${ipGroup._id} in 24h`);
  }
}

export async function cleanupOldFraudLogs(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const result = await FraudLog.deleteMany({
    createdAt: { $lt: thirtyDaysAgo }
  });

  logger.info(`Cleaned up ${result.deletedCount} old fraud logs`);
}