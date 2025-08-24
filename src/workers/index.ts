import { startFakeWinsWorker } from '../jobs/fakeWinsScheduler';
import { startLeaderboardWorker } from '../jobs/leaderboardRefresh';
import { startCleanupWorker } from '../jobs/cleanup';
import { connectDB } from '../db';
import { connectRedis } from '../lib/redis';
import { logger } from '../lib/logger';

async function startWorkers(): Promise<void> {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();

    // Start all workers
    startFakeWinsWorker();
    startLeaderboardWorker();
    startCleanupWorker();

    logger.info('All workers started successfully');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down workers gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down workers gracefully');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start workers:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  startWorkers().catch((error) => {
    logger.error('Worker startup failed:', error);
    process.exit(1);
  });
}