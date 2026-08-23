import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Redis is used for the product cache, checkout idempotency keys and the
 * distributed rate limiters. It is treated as a *best effort* dependency:
 * if it is unreachable the store must still serve pages and take orders
 * rather than returning 500s for every request.
 */
const redis = new Redis(env.redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
  retryStrategy(times) {
    // Back off, but never give up entirely — Redis may come back.
    return Math.min(times * 200, 5000);
  },
  lazyConnect: false,
});

let healthy = false;
let loggedError = false;

redis.on('error', (err) => {
  healthy = false;
  // ioredis emits on every reconnect attempt; only log the first of a streak.
  if (!loggedError) {
    console.error('[REDIS ERROR]', err.message);
    loggedError = true;
  }
});

redis.on('ready', () => {
  healthy = true;
  loggedError = false;
  console.log('[INFO] Connected to Redis');
});

redis.on('end', () => {
  healthy = false;
});

export const isRedisHealthy = () => healthy;

/**
 * Runs a Redis command, returning `fallback` instead of throwing when Redis
 * is unavailable. Use for caching and other non-critical paths.
 */
export async function redisTry<T>(fn: (client: Redis) => Promise<T>, fallback: T): Promise<T> {
  if (!healthy) return fallback;
  try {
    return await fn(redis);
  } catch (err: any) {
    console.error('[REDIS ERROR]', err?.message ?? err);
    return fallback;
  }
}

export default redis;
