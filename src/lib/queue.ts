import { Queue, Worker } from 'bullmq';
import { redis } from './redis';
import { logger } from './logger';

const connection = {
  host: redis.options?.socket?.host || 'localhost',
  port: redis.options?.socket?.port || 6379,
};

export const fakeWinsQueue = new Queue('fake-wins', { connection });
export const leaderboardQueue = new Queue('leaderboard', { connection });
export const cleanupQueue = new Queue('cleanup', { connection });

export function createWorker<T = unknown>(
  queueName: string,
  processor: (job: { data: T }) => Promise<void>
): Worker {
  return new Worker(queueName, processor, {
    connection,
    concurrency: 1,
  });
}

// Add error handling for queues
[fakeWinsQueue, leaderboardQueue, cleanupQueue].forEach((queue) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${queue.name} error:`, error);
  });
});