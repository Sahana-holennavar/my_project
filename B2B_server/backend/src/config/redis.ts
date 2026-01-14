import Redis, { RedisOptions } from 'ioredis';

export interface RedisConfig extends RedisOptions {
  host: string;
  port: number;
  maxRetriesPerRequest: number;
}

const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 3,
};

const redis = new Redis(redisConfig);

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis server');
});

export default redis;
