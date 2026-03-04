import { beforeEach, describe, expect, it } from 'vitest';

describe('rateLimit fallback in-memory', () => {
  beforeEach(() => {
    delete (globalThis as { __cvRateStore?: unknown }).__cvRateStore;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.RATE_LIMIT_ENABLED = '1';
  });

  it('permite ate o limite e depois bloqueia', async () => {
    const { rateLimit } = await import('@/lib/ratelimit');
    const key = 'tests:ask:user-1';
    const first = await rateLimit(key, { limit: 1, windowSec: 60, prefix: 'cv:test' });
    const second = await rateLimit(key, { limit: 1, windowSec: 60, prefix: 'cv:test' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.remaining).toBe(0);
    expect(second.resetAt).toBeGreaterThan(Date.now());
  });
});
