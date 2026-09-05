// src/lib/cache.ts
// Cache-aside helpers using Redis. Spec §6.7:
// TTL 300s for: price:{priceListId}, catalog:all, upsell:rules
// Invalidate by deleting the key on any admin write.
import { redis } from "@/lib/redis";

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache failures are non-fatal — fall through to DB
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {}
}

export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

// ─── Cache key constants (§6.7) ───────────────────────────────────────────────

export const CacheKeys = {
  catalog: "catalog:all",
  priceList: (id: string) => `price:${id}`,
  upsellRules: "upsell:rules",
} as const;
