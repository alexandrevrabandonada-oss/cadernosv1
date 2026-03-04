import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { enforceIngestLimit } from '@/lib/ratelimit/enforce';
import { runIngestWorker } from '@/lib/ingest/worker';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(session.role === 'admin' || session.role === 'editor')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const rl = await enforceIngestLimit(session.userId);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        retryAfterSec: rl.retryAfterSec,
        message: `Muitas acoes em pouco tempo. Tente novamente em ${rl.retryAfterSec}s.`,
      },
      { status: 429 },
    );
  }

  const result = await runIngestWorker({ limit: 5, workerId: `api:${session.userId}:${Date.now()}` });
  return NextResponse.json(result);
}
