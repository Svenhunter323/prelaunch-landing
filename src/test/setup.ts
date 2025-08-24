import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { redis } from '../lib/redis';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  await mongoServer.stop();
  await redis.quit();
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    if (collection) {
      await collection.deleteMany({});
    }
  }
  
  // Clear Redis
  await redis.flushAll();
});