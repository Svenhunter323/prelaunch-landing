import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.nodeEnv === 'test' ? 'silent' : 'info',
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});