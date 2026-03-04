import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { enqueueIngestJob } from '@/lib/ingest/jobs';
import { getAdminDb } from '@/lib/admin/db';
import { enforceAdminWriteLimit, enforceIngestLimit } from '@/lib/ratelimit/enforce';

export const runtime = 'nodejs';

type EnqueueBody = {
  universeId?: string;
  documentId?: string;
};

function normalizeInput(value: unknown) {
  return String(value ?? '').trim();
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(session.role === 'admin' || session.role === 'editor')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: EnqueueBody = {};
  try {
    body = (await request.json()) as EnqueueBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const universeId = normalizeInput(body.universeId);
  const documentId = normalizeInput(body.documentId);
  if (!universeId || !documentId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const { data: doc } = await db
    .from('documents')
    .select('id, status')
    .eq('id', documentId)
    .eq('universe_id', universeId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: 'document_not_found' }, { status: 404 });
  if (doc.status !== 'uploaded') {
    return NextResponse.json({ error: 'document_not_upload_ready', status: doc.status }, { status: 409 });
  }

  const adminRl = await enforceAdminWriteLimit(session.userId, `api/admin/import/enqueue/${universeId}`);
  if (!adminRl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: adminRl.retryAfterSec },
      { status: 429 },
    );
  }

  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: ingestRl.retryAfterSec },
      { status: 429 },
    );
  }

  const job = await enqueueIngestJob({ universeId, documentId });
  return NextResponse.json({ ok: true, jobId: job?.id ?? null, status: job?.status ?? null });
}
