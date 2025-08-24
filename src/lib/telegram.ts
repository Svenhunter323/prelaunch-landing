import { Telegraf } from 'telegraf';
import { config } from '../config';
import { logger } from './logger';

let bot: Telegraf | null = null;

export function getTelegramBot(): Telegraf | null {
  if (!config.telegramBotToken) {
    return null;
  }
  
  if (!bot) {
    bot = new Telegraf(config.telegramBotToken);
  }
  
  return bot;
}

export async function checkChannelMembership(userId: number): Promise<boolean> {
  const telegramBot = getTelegramBot();
  if (!telegramBot || !config.telegramChannelId) {
    return false;
  }

  try {
    const member = await telegramBot.telegram.getChatMember(config.telegramChannelId, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (error) {
    logger.error('Failed to check channel membership:', error);
    return false;
  }
}

export async function setWebhook(url: string): Promise<void> {
  const telegramBot = getTelegramBot();
  if (!telegramBot) {
    throw new Error('Telegram bot not configured');
  }

  try {
    await telegramBot.telegram.setWebhook(url);
    logger.info(`Telegram webhook set to: ${url}`);
  } catch (error) {
    logger.error('Failed to set Telegram webhook:', error);
    throw error;
  }
}