import 'server-only';
import { isRateLimitEnabled, isUpstashConfigured } from '@/lib/ratelimit/config';

type RateLimitOptions = {
  limit: number;
  windowSec: number;
  prefix?: string;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

type MemoryBucket = {
  timestamps: number[];
};

const memoryStore = globalThis as typeof globalThis & {
  __cvRateStore?: Map<string, MemoryBucket>;
};

function getMemoryStore() {
  if (!memoryStore.__cvRateStore) {
    memoryStore.__cvRateStore = new Map<string, MemoryBucket>();
  }
  return memoryStore.__cvRateStore;
}

function buildKey(key: string, prefix = 'cv:rl') {
  return `${prefix}:${key}`;
}

function memoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSec * 1000;
  const store = getMemoryStore();
  const current = store.get(key) ?? { timestamps: [] };
  const recent = current.timestamps.filter((ts) => now - ts < windowMs);

  if (recent.length >= options.limit) {
    const oldest = recent[0] ?? now;
    return {
      ok: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  recent.push(now);
  store.set(key, { timestamps: recent });

  return {
    ok: true,
    remaining: Math.max(0, options.limit - recent.length),
    resetAt: now + windowMs,
  };
}

async function upstashRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return memoryRateLimit(buildKey(key, options.prefix), options);
  }

  const pipelineUrl = `${url.replace(/\/$/, '')}/pipeline`;
  const now = Date.now();
  const redisKey = buildKey(key, options.prefix);

  const response = await fetch(pipelineUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['TTL', redisKey],
      ['EXPIRE', redisKey, options.windowSec, 'NX'],
    ]),
    cache: 'no-store',
  });

  if (!response.ok) {
    return memoryRateLimit(buildKey(key, options.prefix), options);
  }

  const data = (await response.json()) as Array<{ result?: number; error?: string }>;
  const count = Number(data?.[0]?.result ?? 0);
  let ttl = Number(data?.[1]?.result ?? options.windowSec);
  if (!Number.isFinite(ttl) || ttl < 0) ttl = options.windowSec;

  return {
    ok: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    resetAt: now + ttl * 1000,
  };
}

export async function rateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const normalizedKey = buildKey(key, options.prefix);
  if (!isRateLimitEnabled()) {
    return {
      ok: true,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: Date.now() + options.windowSec * 1000,
    };
  }

  if (!isUpstashConfigured()) {
    return memoryRateLimit(normalizedKey, options);
  }

  return upstashRateLimit(key, options);
}
