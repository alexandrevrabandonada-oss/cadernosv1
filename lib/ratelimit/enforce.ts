import 'server-only';
import { RATE_LIMITS } from '@/lib/ratelimit/config';
import { rateLimit } from '@/lib/ratelimit';
import { buildAdminWriteRateKey, buildIngestRateKey } from '@/lib/ratelimit/keys';

export async function enforceAdminWriteLimit(userId: string, route: string) {
  const config = RATE_LIMITS.adminWrite;
  const result = await rateLimit(
    buildAdminWriteRateKey({
      userId,
      route,
      windowSec: config.windowSec,
    }),
    { limit: config.limit, windowSec: config.windowSec, prefix: 'cv:admin' },
  );

  return {
    ...result,
    retryAfterSec: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}

export async function enforceIngestLimit(userId: string) {
  const config = RATE_LIMITS.ingest;
  const result = await rateLimit(
    buildIngestRateKey({
      userId,
      windowSec: config.windowSec,
    }),
    { limit: config.limit, windowSec: config.windowSec, prefix: 'cv:ingest' },
  );

  return {
    ...result,
    retryAfterSec: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}
