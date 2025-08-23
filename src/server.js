const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDb = require('./db');
const cfg = require('./config');
const captureContext = require('./middleware/captureContext');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const telegramRoutes = require('./routes/telegram');
const { getBot } = require('./services/telegram');
const { startFakeWinsJob } = require('./jobs/fakeWins');

(async () => {
  await connectDb();

  const corsAllWithCreds = {
    origin: true,              // reflect the Origin header (allows any origin)
    credentials: true,         // allow cookies
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
    maxAge: 86400,
  };

  const app = express();
  app.set('trust proxy', 1);
  // app.use(helmet());
  app.use(cors(corsAllWithCreds));
  app.options('*', cors(corsAllWithCreds));
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(captureContext);

  // Basic rate limit (esp. signup)
  app.use('/api/waitlist', rateLimit({ windowMs: 60_000, max: 15 }));

  app.use('/api', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/telegram', telegramRoutes);

  app.get('/health', (_, res) => res.json({ ok: true }));

// ====== STATIC REACT BUILD ======
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));

  // SPA fallback (only if no /api match)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
// ====== END STATIC REACT BUILD ======

  const server = app.listen(cfg.port, () => {
    console.log(`[api] listening on :${cfg.port}`);
  });

  // Telegram webhook init (if token set)
  const bot = getBot();
  if (bot && cfg.telegram.publicBaseUrl && cfg.telegram.webhookSecret) {
    const url = `${cfg.telegram.publicBaseUrl}/api/telegram/webhook/${cfg.telegram.webhookSecret}`;
    bot.telegram.setWebhook(url).then(() => {
      console.log('[tg] webhook set', url);
    }).catch(e => console.warn('[tg] webhook error', e.message));
  }

  // Start fake wins generator
  startFakeWinsJob();
})();
