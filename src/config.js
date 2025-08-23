require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please create a .env file based on .env.example');
  process.exit(1);
}

const cfg = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,

  mailchimp: {
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER_PREFIX,
    listId: process.env.MAILCHIMP_LIST_ID,
    from: process.env.MAIL_FROM
  },

  mailtrap: {
    host: process.env.MAILTRAP_HOST,
    port: Number(process.env.MAILTRAP_PORT || 2525),
    username: process.env.MAILTRAP_USERNAME,
    password: process.env.MAILTRAP_PASSWORD
  },

  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    publicBaseUrl: process.env.PUBLIC_BASE_URL
  },

  antifraud: {
    maxPerIpPerDay: Number(process.env.MAX_SIGNUPS_PER_IP_PER_DAY || 5),
    allowSelfRef: process.env.ALLOW_SELF_REF === '1'
  },

  email: {
    host: process.env.MAILTRAP_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAILTRAP_PORT || 587),
    secure: process.env.MAILTRAP_SECURE === 'true',
    user: process.env.MAILTRAP_USERNAME,
    password: process.env.MAILTRAP_PASSWORD,
    from: process.env.MAIL_FROM
  }
};

module.exports = cfg;
