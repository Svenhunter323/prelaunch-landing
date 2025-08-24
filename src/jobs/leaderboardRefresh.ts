import { createWorker } from '../lib/queue';
import { generateLeaderboardSnapshot } from '../services/leaderboardService';
import { validateReferralEligibility } from '../services/referralService';
import { runFraudDetection } from '../services/fraudService';
import { logger } from '../lib/logger';

export function startLeaderboardWorker(): void {
  const worker = createWorker('leaderboard', async (job) => {
    try {
      const { force = false } = job.data as { force?: boolean };
      
      logger.info('Starting leaderboard refresh job');

      // Step 1: Validate referral eligibility
      await validateReferralEligibility();
      logger.info('Referral eligibility validation completed');

      // Step 2: Run fraud detection
      await runFraudDetection();
      logger.info('Fraud detection completed');

      // Step 3: Generate new leaderboard snapshot
      await generateLeaderboardSnapshot();
      logger.info('Leaderboard snapshot generated');

      logger.info('Leaderboard refresh job completed successfully');
    } catch (error) {
      logger.error('Leaderboard refresh job failed:', error);
      throw error;
    }
  });

  worker.on('completed', (job) => {
    logger.info(`Leaderboard refresh job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`Leaderboard refresh job ${job?.id} failed:`, error);
  });

  logger.info('Leaderboard refresh worker started');
}