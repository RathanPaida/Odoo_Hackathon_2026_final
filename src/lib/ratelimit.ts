// src/lib/ratelimit.ts
// Token bucket rate limiter in Redis. Spec §6.8:
// Applied ONLY to /api/portal/*: 30 req/min per IP, 100 req/hr per token.
// Returns HTTP 429 with Retry-After when limit exceeded.
import { redis } from "@/lib/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // unix ms
  retryAfterSeconds: number;
}

/**
 * Token bucket rate limiter using Redis INCR + EXPIRE.
 * @param key     Unique bucket key (e.g. "portal-ip:1.2.3.4")
 * @param max     Max requests allowed in the window
 * @param windowSeconds  Window duration in seconds
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = `rl:${key}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.pttl(redisKey);
    const results = await pipeline.exec();

    if (!results) throw new Error("Redis pipeline failed");

    const count = results[0][1] as number;
    const pttl = results[1][1] as number;

    // On first request, set expiry
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const ttlMs = pttl > 0 ? pttl : windowSeconds * 1000;
    const resetAt = now + ttlMs;
    const remaining = Math.max(0, max - count);
    const success = count <= max;
    const retryAfterSeconds = success ? 0 : Math.ceil(ttlMs / 1000);

    return { success, limit: max, remaining, resetAt, retryAfterSeconds };
  } catch {
    // Redis down — fail open (allow request) to avoid blocking portal entirely
    return {
      success: true,
      limit: max,
      remaining: max,
      resetAt: now + windowSeconds * 1000,
      retryAfterSeconds: 0,
    };
  }
}

// ─── Preset limiters (spec §6.8) ──────────────────────────────────────────────

/** 30 requests per minute per IP on /api/portal/* */
export async function portalIpLimit(ip: string): Promise<RateLimitResult> {
  return rateLimit(`portal-ip:${ip}`, 30, 60);
}

/** 100 requests per hour per portal token */
export async function portalTokenLimit(tokenHash: string): Promise<RateLimitResult> {
  return rateLimit(`portal-tok:${tokenHash}`, 100, 3600);
}
