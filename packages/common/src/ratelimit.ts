import type { Logger } from "./logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Fixed-window rate limiter keyed by caller (phone, IP, user). */
export interface RateLimiter {
  hit(key: string, limit: number, windowSec: number): Promise<RateLimitResult>;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();

  async hit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
    const now = Date.now();
    if (now - this.lastSweep > 60_000) {
      for (const [k, w] of this.windows) if (w.resetAt <= now) this.windows.delete(k);
      this.lastSweep = now;
    }
    let w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowSec * 1000 };
      this.windows.set(key, w);
    }
    w.count++;
    const allowed = w.count <= limit;
    return { allowed, remaining: Math.max(0, limit - w.count), retryAfterSec: allowed ? 0 : Math.ceil((w.resetAt - now) / 1000) };
  }
}

export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: import("ioredis").Redis) {}

  async hit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
    const k = `rl:${key}`;
    const [[, count], [, ttl]] = (await this.redis.multi().incr(k).ttl(k).exec()) as [[unknown, number], [unknown, number]];
    if (ttl < 0) await this.redis.expire(k, windowSec);
    const allowed = count <= limit;
    return { allowed, remaining: Math.max(0, limit - count), retryAfterSec: allowed ? 0 : Math.max(1, ttl) };
  }
}

export async function createRateLimiter(redisUrl: string | undefined, log: Logger): Promise<RateLimiter> {
  if (!redisUrl) return new MemoryRateLimiter();
  const { Redis } = await import("ioredis");
  const redis = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: 2 });
  redis.on("error", (err) => log.warn({ err }, "redis error"));
  return new RedisRateLimiter(redis);
}
