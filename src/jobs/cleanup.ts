import { createWorker } from '../lib/queue';
import { FakeWin } from '../models/FakeWin';
import { FraudLog } from '../models/FraudLog';
import { CleanupJobData } from '../types';
import { logger } from '../lib/logger';

export function startCleanupWorker(): void {
  const worker = createWorker<CleanupJobData>('cleanup', async (job) => {
    try {
      const { type, olderThan } = job.data;
      
      logger.info(`Starting cleanup job for ${type}`);

      let deletedCount = 0;

      switch (type) {
        case 'fake_wins':
          const fakeWinResult = await FakeWin.deleteMany({
            createdAt: { $lt: olderThan }
          });
          deletedCount = fakeWinResult.deletedCount || 0;
          break;

        case 'fraud_logs':
          const fraudLogResult = await FraudLog.deleteMany({
            createdAt: { $lt: olderThan }
          });
          deletedCount = fraudLogResult.deletedCount || 0;
          break;

        default:
          throw new Error(`Unknown cleanup type: ${type}`);
      }

      logger.info(`Cleanup job completed: deleted ${deletedCount} ${type} records`);
    } catch (error) {
      logger.error('Cleanup job failed:', error);
      throw error;
    }
  });

  worker.on('completed', (job) => {
    logger.info(`Cleanup job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`Cleanup job ${job?.id} failed:`, error);
  });

  logger.info('Cleanup worker started');
}