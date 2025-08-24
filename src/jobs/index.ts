import { fakeWinsQueue, leaderboardQueue, cleanupQueue } from '../lib/queue';
import { startFakeWinsWorker } from './fakeWinsScheduler';
import { startLeaderboardWorker } from './leaderboardRefresh';
import { startCleanupWorker } from './cleanup';
import { logger } from '../lib/logger';

export async function startJobs(): Promise<void> {
  try {
    // Start workers
    startFakeWinsWorker();
    startLeaderboardWorker();
    startCleanupWorker();

    // Schedule recurring jobs
    await scheduleRecurringJobs();

    logger.info('All background jobs started');
  } catch (error) {
    logger.error('Failed to start jobs:', error);
    throw error;
  }
}

async function scheduleRecurringJobs(): Promise<void> {
  // Schedule fake wins generation
  await fakeWinsQueue.add('generate-fake-win', {}, {
    repeat: { every: 90000 }, // Every 90 seconds
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  // Schedule leaderboard refresh (every hour)
  await leaderboardQueue.add('refresh-leaderboard', {}, {
    repeat: { cron: '0 * * * *' },
    removeOnComplete: 5,
    removeOnFail: 3,
  });

  // Schedule cleanup jobs (daily at 2 AM)
  await cleanupQueue.add('cleanup-fake-wins', { 
    type: 'fake_wins',
    olderThan: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
  }, {
    repeat: { cron: '0 2 * * *' },
    removeOnComplete: 3,
    removeOnFail: 3,
  });

  await cleanupQueue.add('cleanup-fraud-logs', {
    type: 'fraud_logs',
    olderThan: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
  }, {
    repeat: { cron: '0 2 * * *' },
    removeOnComplete: 3,
    removeOnFail: 3,
  });

  logger.info('Recurring jobs scheduled');
}