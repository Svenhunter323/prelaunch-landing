import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  port: z.number().default(8080),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  mongoUri: z.string().min(1),
  jwtSecret: z.string().min(32),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  redisUrl: z.string().min(1),
  
  // Mailchimp
  mailchimpApiKey: z.string().optional(),
  mailchimpServerPrefix: z.string().optional(),
  mailchimpListId: z.string().optional(),
  mailFromEmail: z.string().email().default('help@zoggybet.com'),
  mailFromName: z.string().default('Zoggy'),
  
  // Telegram
  telegramBotToken: z.string().optional(),
  telegramChannelId: z.string().optional(),
  telegramWebhookSecret: z.string().optional(),
  
  // Rate limiting
  rateLimitWindow: z.number().default(60000),
  rateLimitMax: z.number().default(120),
  
  // Public URL
  publicBaseUrl: z.string().url().optional(),
  
  // Admin
  adminEmail: z.string().email().default('admin@zoggybet.com'),
  adminPassword: z.string().min(8).default('changeme'),
});

const parseConfig = (): z.infer<typeof configSchema> => {
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  return configSchema.parse({
    port: Number(process.env.PORT) || 8080,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    corsOrigins,
    redisUrl: process.env.REDIS_URL,
    
    mailchimpApiKey: process.env.MAILCHIMP_API_KEY,
    mailchimpServerPrefix: process.env.MAILCHIMP_SERVER_PREFIX,
    mailchimpListId: process.env.MAILCHIMP_LIST_ID,
    mailFromEmail: process.env.MAIL_FROM_EMAIL,
    mailFromName: process.env.MAIL_FROM_NAME,
    
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID,
    telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    
    rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 60000,
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 120,
    
    publicBaseUrl: process.env.PUBLIC_BASE_URL,
    
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
  });
};

export const config = parseConfig();