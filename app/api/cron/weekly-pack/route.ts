import { NextRequest, NextResponse } from 'next/server';
import { ensureWeeklyPacksAllUniverses } from '@/lib/share/scheduler';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

function getCronSecret() {
  if (process.env.CRON_SECRET?.trim()) return process.env.CRON_SECRET.trim();
  if (process.env.TEST_SEED === '1') return 'test-cron-secret';
  return '';
}

export async function POST(request: NextRequest) {
  const expected = getCronSecret();
  const provided = request.headers.get('x-cron-secret')?.trim() ?? '';
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const minuteBucket = Math.floor(Date.now() / 60000);
  const rl = await rateLimit(`cron:weekly-pack:${minuteBucket}`, {
    limit: 2,
    windowSec: 60,
    prefix: 'cv:cron',
  });
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const result = await ensureWeeklyPacksAllUniverses({
    runKind: 'cron',
    now: new Date(),
    updatedBy: 'cron',
    force: false,
  });

  return NextResponse.json({
    ok: true,
    total: result.total,
    processed: result.processed,
    skipped: result.skipped,
    results: result.results,
  });
}

