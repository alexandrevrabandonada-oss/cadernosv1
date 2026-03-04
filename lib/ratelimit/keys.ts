import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function extractClientIp(source: NextRequest) {
  const forwarded = source.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = source.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = source.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return 'unknown';
}

function bucketFor(windowSec: number, now = Date.now()) {
  return Math.floor(now / (windowSec * 1000));
}

function identity(userId?: string | null, ip?: string | null) {
  if (userId) return `u:${hash(userId)}`;
  return `i:${hash(ip || 'unknown')}`;
}

export function buildAskRateKey(input: {
  universeId: string;
  windowSec: number;
  userId?: string | null;
  ip?: string | null;
  now?: number;
}) {
  const b = bucketFor(input.windowSec, input.now);
  const id = identity(input.userId, input.ip);
  return `ask:${input.universeId}:${id}:${b}`;
}

export function buildIngestRateKey(input: { userId: string; windowSec: number; now?: number }) {
  const b = bucketFor(input.windowSec, input.now);
  return `ingest:u:${hash(input.userId)}:${b}`;
}

export function buildAdminWriteRateKey(input: {
  userId: string;
  route: string;
  windowSec: number;
  now?: number;
}) {
  const b = bucketFor(input.windowSec, input.now);
  return `admin:u:${hash(input.userId)}:${input.route}:${b}`;
}
