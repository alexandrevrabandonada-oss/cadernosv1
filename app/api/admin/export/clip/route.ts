import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { createClipExport, getUniverseIdBySlug } from '@/lib/export/service';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

export const runtime = 'nodejs';

type Payload = {
  universeId?: string;
  universeSlug?: string;
  sourceType?: 'evidence' | 'thread' | 'doc_cite';
  sourceId?: string;
  snippet?: string;
  title?: string;
  docId?: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  sourceUrl?: string;
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

  const universeIdRaw = clean(payload.universeId);
  const universeSlug = clean(payload.universeSlug);
  const sourceType = payload.sourceType;
  const sourceId = clean(payload.sourceId);
  const snippet = clean(payload.snippet);
  const title = clean(payload.title);
  const docId = clean(payload.docId);
  const pageStart = typeof payload.pageStart === 'number' ? payload.pageStart : null;
  const pageEnd = typeof payload.pageEnd === 'number' ? payload.pageEnd : null;
  const sourceUrl = clean(payload.sourceUrl);
  if ((!universeIdRaw && !universeSlug) || !sourceId || !snippet || !sourceType) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  if (!['evidence', 'thread', 'doc_cite'].includes(sourceType)) {
    return NextResponse.json({ error: 'invalid_source_type' }, { status: 400 });
  }

  const universeId =
    universeIdRaw ||
    (process.env.TEST_SEED === '1' && universeSlug
      ? `mock-${universeSlug}`
      : universeSlug
        ? ((await getUniverseIdBySlug(universeSlug)) ?? '')
        : '');
  if (!universeId) {
    return NextResponse.json({ error: 'universe_not_found' }, { status: 404 });
  }

  const rl = await enforceAdminWriteLimit(session.userId, `api/admin/export/clip/${universeId}`);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited', retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  try {
    const created = await createClipExport({
      universeId,
      sourceType,
      sourceId,
      snippet,
      title: title || undefined,
      docId: docId || null,
      pageStart,
      pageEnd,
      sourceUrl: sourceUrl || null,
      isPublic: payload.isPublic === true,
    });
    return NextResponse.json({ ok: true, ...created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'export_failed';
    const status = message === 'forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
