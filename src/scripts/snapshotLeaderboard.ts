import { connectDB } from '../db';
import { connectRedis } from '../lib/redis';
import { generateLeaderboardSnapshot } from '../services/leaderboardService';
import { validateReferralEligibility } from '../services/referralService';
import { runFraudDetection } from '../services/fraudService';
import { logger } from '../lib/logger';

async function snapshotLeaderboard(): Promise<void> {
  try {
    await connectDB();
    await connectRedis();
    
    logger.info('Starting manual leaderboard snapshot...');
    
    // Step 1: Validate referral eligibility
    logger.info('Validating referral eligibility...');
    await validateReferralEligibility();
    
    // Step 2: Run fraud detection
    logger.info('Running fraud detection...');
    await runFraudDetection();
    
    // Step 3: Generate snapshot
    logger.info('Generating leaderboard snapshot...');
    await generateLeaderboardSnapshot();
    
    logger.info('Leaderboard snapshot completed successfully');
    process.exit(0);
    
  } catch (error) {
    logger.error('Failed to generate leaderboard snapshot:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  snapshotLeaderboard();
}

export { snapshotLeaderboard };