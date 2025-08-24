import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { config } from './config';
import { connectDB } from './db';
import { connectRedis } from './lib/redis';
import { logger } from './lib/logger';
import { errorHandler } from './middlewares/errorHandler';
import { ipDevice } from './middlewares/ipDevice';

// Routes
import authRoutes from './routes/auth';
import waitlistRoutes from './routes/waitlist';
import chestRoutes from './routes/chest';
import telegramRoutes from './routes/telegram';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import winsRoutes from './routes/wins';

// Jobs
import { startJobs } from './jobs';

async function bootstrap(): Promise<void> {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();

    const app = express();

    // Security middleware
    app.use(helmet());
    app.use(cors({
      origin: config.corsOrigins,
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimitWindow,
      max: config.rateLimitMax,
      message: { error: 'Too many requests' },
    });
    app.use(limiter);

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Custom middleware
    app.use(ipDevice);

    // API Documentation
    try {
      const swaggerDocument = YAML.load(path.join(__dirname, 'docs/openapi.yaml'));
      app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } catch (error) {
      logger.warn('Could not load OpenAPI documentation');
    }

    // Health check
    app.get('/healthz', (req, res) => {
      res.json({ ok: true, timestamp: new Date().toISOString() });
    });

    // API Routes
    app.use('/auth', authRoutes);
    app.use('/waitlist', waitlistRoutes);
    app.use('/chest', chestRoutes);
    app.use('/telegram', telegramRoutes);
    app.use('/leaderboard', leaderboardRoutes);
    app.use('/admin', adminRoutes);
    app.use('/wins', winsRoutes);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    app.use(errorHandler);

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });

    // Start background jobs
    await startJobs();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  logger.error('Bootstrap failed:', error);
  process.exit(1);
});