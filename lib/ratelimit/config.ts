export const RATE_LIMITS = {
  askAnon: { limit: 20, windowSec: 60 },
  askAuth: { limit: 60, windowSec: 60 },
  ingest: { limit: 5, windowSec: 60 },
  adminWrite: { limit: 30, windowSec: 60 },
} as const;

export function isRateLimitEnabled() {
  return process.env.RATE_LIMIT_ENABLED !== '0';
}

export function isUpstashConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
