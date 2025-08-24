import { createWorker } from '../lib/queue';
import { FakeWin } from '../models/FakeWin';
import { drawFakeWinAmount } from '../lib/rng';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

const USERNAMES = [
  'CryptoWolf', 'Juan232', 'AvaX', 'SolKing', 'MemeLord', 'Luna88',
  'DragonHodl', 'Khalid7', 'RashidQ', 'NinoX', 'SatoshiLite',
  'BitMaster', 'EthereumKing', 'DogeCoin', 'ToTheMoon', 'DiamondHands',
  'PaperHands', 'HODL4Life', 'CryptoNinja', 'BlockchainBoss', 'NFTCollector'
];

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
  'Australia', 'Japan', 'South Korea', 'Brazil', 'Mexico',
  'Netherlands', 'Sweden', 'Norway', 'Switzerland', 'Austria'
];

function getRandomUsername(): string {
  return USERNAMES[Math.floor(Math.random() * USERNAMES.length)]!;
}

function getRandomCountry(): string {
  return COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]!;
}

async function isUsernameRecentlyUsed(username: string): Promise<boolean> {
  const key = `recent_username:${username}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

async function markUsernameAsUsed(username: string): Promise<void> {
  const key = `recent_username:${username}`;
  await redis.setEx(key, 5400, '1'); // 90 minutes
}

async function canGenerateBigWin(amount: number): Promise<boolean> {
  if (amount < 2000) return true;

  // Check for recent big wins
  if (amount >= 10000) {
    const key = 'last_mega_win';
    const lastMegaWin = await redis.get(key);
    if (lastMegaWin) {
      const lastTime = parseInt(lastMegaWin);
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      if (lastTime > threeHoursAgo) {
        return false;
      }
    }
  }

  if (amount >= 2000) {
    const key = 'last_big_win';
    const lastBigWin = await redis.get(key);
    if (lastBigWin) {
      const lastTime = parseInt(lastBigWin);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (lastTime > oneHourAgo) {
        return false;
      }
    }
  }

  return true;
}

async function recordBigWin(amount: number): Promise<void> {
  const now = Date.now().toString();
  
  if (amount >= 10000) {
    await redis.setEx('last_mega_win', 10800, now); // 3 hours
  }
  
  if (amount >= 2000) {
    await redis.setEx('last_big_win', 3600, now); // 1 hour
  }
}

export function startFakeWinsWorker(): void {
  const worker = createWorker('fake-wins', async () => {
    try {
      // Get available username
      let username: string;
      let attempts = 0;
      do {
        username = getRandomUsername();
        attempts++;
      } while (await isUsernameRecentlyUsed(username) && attempts < 10);

      if (attempts >= 10) {
        logger.warn('Could not find unused username, using random one');
        username = `${getRandomUsername()}${Math.floor(Math.random() * 1000)}`;
      }

      // Draw amount
      const amount = drawFakeWinAmount();
      
      // Check if big win is allowed
      if (amount >= 2000 && !(await canGenerateBigWin(amount))) {
        logger.debug('Big win blocked due to recent big wins');
        return;
      }

      // Create fake win
      await FakeWin.create({
        username,
        country: getRandomCountry(),
        amount,
        kind: amount >= 1000 ? 'big' : 'small',
      });

      // Mark username as used
      await markUsernameAsUsed(username);

      // Record big win timing
      if (amount >= 2000) {
        await recordBigWin(amount);
        
        // Schedule follow-up small wins after big wins
        const followUpCount = Math.floor(Math.random() * 6) + 5; // 5-10 wins
        for (let i = 0; i < followUpCount; i++) {
          setTimeout(async () => {
            try {
              const smallAmount = Math.random() < 0.8 ? 10 : 25; // Mostly small wins
              await FakeWin.create({
                username: getRandomUsername(),
                country: getRandomCountry(),
                amount: smallAmount,
                kind: 'small',
              });
            } catch (error) {
              logger.error('Failed to create follow-up fake win:', error);
            }
          }, (i + 1) * 3000); // 3 second intervals
        }
      }

      // Cleanup old fake wins (keep last 1000)
      const count = await FakeWin.countDocuments();
      if (count > 1000) {
        const oldWins = await FakeWin.find()
          .sort({ createdAt: 1 })
          .limit(count - 1000);
        
        const oldIds = oldWins.map(w => w._id);
        await FakeWin.deleteMany({ _id: { $in: oldIds } });
      }

      logger.debug(`Generated fake win: ${username} won $${amount}`);
    } catch (error) {
      logger.error('Fake wins job error:', error);
      throw error;
    }
  });

  worker.on('completed', () => {
    logger.debug('Fake win generated');
  });

  worker.on('failed', (job, error) => {
    logger.error('Fake wins job failed:', error);
  });

  logger.info('Fake wins worker started');
}