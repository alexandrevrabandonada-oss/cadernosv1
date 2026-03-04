import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { detectPdfUrl, fetchMetadataFromDoi, isSafeHttpUrl } from '@/lib/import/resolve';
import { normalizeImportMetadata } from '@/lib/ingest/normalizeMetadata';

export const runtime = 'nodejs';

type PreviewBody = {
  universeId?: string;
  value?: string;
};

function isDoiInput(value: string) {
  if (/^https?:\/\/(dx\.)?doi\.org\//i.test(value)) return true;
  return /^10\.\d{4,9}\//.test(value.trim());
}

function normalizeInput(value: unknown) {
  return String(value ?? '').trim();
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(session.role === 'admin' || session.role === 'editor')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: PreviewBody = {};
  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const universeId = normalizeInput(body.universeId);
  const value = normalizeInput(body.value);
  if (!universeId || !value) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const rl = await enforceAdminWriteLimit(session.userId, `api/admin/import/preview/${universeId}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  const isDoi = isDoiInput(value);
  if (!isDoi && !isSafeHttpUrl(value)) {
    return NextResponse.json({ error: 'unsafe_or_invalid_url' }, { status: 400 });
  }

  if (isDoi) {
    const meta = await fetchMetadataFromDoi(value);
    const pdfDetection = await detectPdfUrl(meta.resolvedUrl ?? meta.sourceUrl ?? null);
    const normalized = normalizeImportMetadata({
      title: meta.title ?? undefined,
      authors: meta.authors ?? undefined,
      year: meta.year ?? undefined,
      journal: meta.journal ?? undefined,
      abstract: meta.abstract ?? undefined,
      doi: meta.doi ?? value,
      sourceUrl: meta.resolvedUrl ?? meta.sourceUrl ?? undefined,
      pdfUrl: pdfDetection.isPdf ? (pdfDetection.finalUrl ?? meta.resolvedUrl ?? meta.sourceUrl ?? undefined) : undefined,
      importSource: 'crossref',
      kind: 'doi',
    });

    return NextResponse.json({
      ok: true,
      inputType: 'doi',
      metadata: normalized,
      resolvedUrl: meta.resolvedUrl ?? meta.sourceUrl ?? null,
      pdfDetected: pdfDetection.isPdf,
      pdfUrl: pdfDetection.finalUrl,
    });
  }

  const pdfDetection = await detectPdfUrl(value);
  const normalized = normalizeImportMetadata({
    title: value,
    sourceUrl: value,
    pdfUrl: pdfDetection.isPdf ? (pdfDetection.finalUrl ?? value) : undefined,
    importSource: 'url',
    kind: 'url',
  });

  return NextResponse.json({
    ok: true,
    inputType: 'url',
    metadata: normalized,
    resolvedUrl: pdfDetection.finalUrl ?? value,
    pdfDetected: pdfDetection.isPdf,
    pdfUrl: pdfDetection.finalUrl ?? null,
  });
}
