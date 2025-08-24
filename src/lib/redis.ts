import { createClient } from 'redis';
import { config } from '../config';
import { logger } from './logger';

export const redis = createClient({
  url: config.redisUrl,
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

redis.on('error', (error) => {
  logger.error('Redis error:', error);
});

redis.on('disconnect', () => {
  logger.warn('Redis disconnected');
});