import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../lib/logger';

// Add global plugins
mongoose.plugin((schema) => {
  schema.set('timestamps', true);
  schema.set('toJSON', {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
});

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});