import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { createInboxBatch, createUniverseFromInboxBatch, getInboxBatch } from '@/lib/universe/inbox';

export const runtime = 'nodejs';

function isPrivileged(role: string | null | undefined) {
  return role === 'admin' || role === 'editor';
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isPrivileged(session.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const batchId = url.searchParams.get('batchId')?.trim() ?? '';
  if (!batchId) return NextResponse.json({ error: 'missing_batch_id' }, { status: 400 });

  const batch = await getInboxBatch(batchId);
  if (!batch) return NextResponse.json({ error: 'batch_not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, batch });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isPrivileged(session.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File)
      .filter((file) => file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf');

    if (files.length === 0) {
      return NextResponse.json({ error: 'missing_pdf_files' }, { status: 400 });
    }

    const batch = await createInboxBatch({ files, userId: session.userId });
    return NextResponse.json({ ok: true, batch });
  }

  const payload = (await request.json().catch(() => null)) as {
    action?: string;
    batchId?: string;
    title?: string;
    slug?: string;
    summary?: string;
    templateId?: string;
    enqueueIngest?: boolean;
  } | null;

  if (payload?.action !== 'create_universe' || !payload.batchId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const result = await createUniverseFromInboxBatch({
    batchId: payload.batchId,
    userId: session.userId,
    title: payload.title ?? null,
    slug: payload.slug ?? null,
    summary: payload.summary ?? null,
    templateId: payload.templateId ?? null,
    enqueueIngest: payload.enqueueIngest !== false,
  });

  return NextResponse.json({
    ok: true,
    result: {
      universe: result.universe,
      program: { id: result.program.id, slug: result.program.slug, title: result.program.title },
      lane: result.lane,
      docsAttached: result.docsAttached,
      batchId: result.batchId,
    },
  });
}
