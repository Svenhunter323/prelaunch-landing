import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateTelegramToken, verifyTelegramToken } from '../lib/jwt';
import { getTelegramBot, checkChannelMembership } from '../lib/telegram';
import { AuthenticatedRequest } from '../middlewares/auth';
import { config } from '../config';
import { logger } from '../lib/logger';

export async function getDeeplink(req: Request, res: Response): Promise<void> {
  try {
    const { user: authUser } = req as AuthenticatedRequest;
    
    if (!config.telegramBotToken) {
      res.status(503).json({ error: 'Telegram not configured' });
      return;
    }

    const token = generateTelegramToken(authUser.id);
    const botUsername = config.telegramBotToken.split(':')[0];
    const url = `https://t.me/${botUsername}?start=${token}`;

    res.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    logger.error('Get deeplink error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const bot = getTelegramBot();
    if (!bot) {
      res.status(503).json({ error: 'Telegram not configured' });
      return;
    }

    // Verify webhook secret
    const secret = req.params.secret;
    if (secret !== config.telegramWebhookSecret) {
      res.status(401).json({ error: 'Invalid webhook secret' });
      return;
    }

    // Process update
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Telegram webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getVerifyStatus(req: Request, res: Response): Promise<void> {
  try {
    const { user: authUser } = req as AuthenticatedRequest;
    
    const user = await User.findById(authUser.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        telegramVerified: user.telegramVerified,
      },
    });
  } catch (error) {
    logger.error('Get verify status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Set up bot handlers
const bot = getTelegramBot();
if (bot) {
  bot.start(async (ctx) => {
    try {
      const payload = ctx.startPayload;
      if (!payload) {
        await ctx.reply('Invalid start link.');
        return;
      }

      const { sub: userId } = verifyTelegramToken(payload);
      const user = await User.findById(userId);
      if (!user) {
        await ctx.reply('Account not found.');
        return;
      }

      // Update user with Telegram ID
      user.telegramId = ctx.from.id;
      await user.save();

      // Check channel membership
      const isMember = await checkChannelMembership(ctx.from.id);
      if (isMember) {
        user.telegramVerified = true;
        await user.save();
        await ctx.reply('✅ Verified! You can now open your daily chest.');
      } else {
        await ctx.reply(`Please join our channel ${config.telegramChannelId} first, then use /verify`);
      }
    } catch (error) {
      logger.error('Telegram start command error:', error);
      await ctx.reply('An error occurred. Please try again.');
    }
  });

  bot.command('verify', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) {
        await ctx.reply('No linked account found. Please use the website to connect your account.');
        return;
      }

      const isMember = await checkChannelMembership(ctx.from.id);
      if (isMember) {
        user.telegramVerified = true;
        await user.save();
        await ctx.reply('✅ Verified! You can now open your daily chest.');
      } else {
        await ctx.reply(`Please join our channel ${config.telegramChannelId} first.`);
      }
    } catch (error) {
      logger.error('Telegram verify command error:', error);
      await ctx.reply('An error occurred. Please try again.');
    }
  });
}