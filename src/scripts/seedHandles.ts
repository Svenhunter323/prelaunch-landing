import { redis } from '../lib/redis';
import { connectRedis } from '../lib/redis';
import { logger } from '../lib/logger';

const USERNAMES = [
  // Crypto themed
  'CryptoWolf', 'BitMaster', 'EthereumKing', 'SatoshiLite', 'DogeCoin',
  'ToTheMoon', 'DiamondHands', 'PaperHands', 'HODL4Life', 'CryptoNinja',
  'BlockchainBoss', 'NFTCollector', 'DefiKing', 'YieldFarmer', 'LiquidityProvider',
  
  // Gaming themed
  'GameMaster', 'PixelWarrior', 'RetroGamer', 'SpeedRunner', 'BossSlayer',
  'LootHunter', 'QuestMaster', 'RaidLeader', 'PvPChamp', 'NoobSlayer',
  
  // International names
  'Juan232', 'AvaX', 'Luna88', 'Khalid7', 'RashidQ', 'NinoX',
  'Ahmed99', 'Sofia_Star', 'Carlos_Win', 'Yuki_Sama', 'Pierre_Lucky',
  'Anna_Crypto', 'Marco_Polo', 'Sasha_Moon', 'Viktor_Win', 'Elena_Gold',
  
  // Fun/Random
  'MemeLord', 'LuckyStrike', 'WinnerTakesAll', 'FortuneSeeker', 'JackpotHunter',
  'BigWinner', 'CashKing', 'MoneyMaker', 'PrizeFighter', 'TreasureHunter',
  'GoldDigger', 'SilverSurfer', 'BronzeMedal', 'ChampionPlayer', 'VictoryLap',
  
  // Tech themed
  'CodeMaster', 'DataMiner', 'AlgoTrader', 'TechGuru', 'DigitalNomad',
  'CloudSurfer', 'APIWizard', 'DatabaseKing', 'ServerAdmin', 'NetworkNinja',
  
  // More international
  'DragonHodl', 'PhoenixRise', 'EagleEye', 'TigerClaw', 'WolfPack',
  'BearMarket', 'BullRun', 'SharkBite', 'LionHeart', 'FoxCunning',
  
  // Numbers and variations
  'Player1337', 'Winner2023', 'Lucky777', 'Jackpot888', 'Fortune999',
  'Strike123', 'Bonus456', 'Prize789', 'Cash101', 'Gold202',
  
  // More creative ones
  'MidnightGamer', 'SunriseWin', 'StormChaser', 'FireStarter', 'IceBreaker',
  'ThunderBolt', 'LightningFast', 'StarGazer', 'MoonWalker', 'SkyDiver',
  'OceanRider', 'MountainTop', 'DesertStorm', 'JungleKing', 'ArcticWolf'
];

async function seedHandles(): Promise<void> {
  try {
    await connectRedis();
    
    logger.info('Seeding usernames to Redis...');
    
    // Store usernames in a Redis set
    const key = 'fake_win_usernames';
    await redis.del(key); // Clear existing
    
    for (const username of USERNAMES) {
      await redis.sAdd(key, username);
    }
    
    logger.info(`Seeded ${USERNAMES.length} usernames to Redis set: ${key}`);
    
    // Also store as a backup JSON in case we need it
    await redis.set('fake_win_usernames_backup', JSON.stringify(USERNAMES));
    
    logger.info('Username seeding completed successfully');
    process.exit(0);
    
  } catch (error) {
    logger.error('Failed to seed usernames:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedHandles();
}

export { seedHandles };