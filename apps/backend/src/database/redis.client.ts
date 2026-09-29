import { Redis } from 'ioredis';
import { config, logger } from '../config/index.js';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 2000);
        return delay;
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisInstance.on('connect', () => {
      logger.info('Connected to Redis server');
    });

    redisInstance.on('error', (err) => {
      logger.warn({ err }, 'Redis connection error');
    });
  }

  return redisInstance;
}

export async function checkRedisHealth(): Promise<{
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}> {
  try {
    const client = getRedisClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    const start = Date.now();
    const reply = await client.ping();
    const latencyMs = Date.now() - start;

    if (reply === 'PONG') {
      return { status: 'ok', latencyMs };
    }
    return { status: 'error', error: `Unexpected ping response: ${reply}` };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
      logger.info('Redis connection closed cleanly');
    } catch {
      redisInstance.disconnect();
    } finally {
      redisInstance = null;
    }
  }
}
