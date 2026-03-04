import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { createThreadDossier } from '@/lib/export/service';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

export const runtime = 'nodejs';

type Payload = {
  universeId?: string;
  threadId?: string;
  isPublic?: boolean;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(session.role === 'admin' || session.role === 'editor')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let payload: Payload = {};
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const universeId = clean(payload.universeId);
  const threadId = clean(payload.threadId);
  if (!universeId || !threadId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const rl = await enforceAdminWriteLimit(session.userId, `api/admin/export/thread/${universeId}`);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited', retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  try {
    const created = await createThreadDossier({
      universeId,
      threadId,
      isPublic: payload.isPublic === true,
    });
    return NextResponse.json({ ok: true, ...created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'export_failed';
    const status = message === 'forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
