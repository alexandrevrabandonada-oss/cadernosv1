import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/admin/db';
import { enqueueIngestJob } from '@/lib/ingest/jobs';
import { normalizeImportMetadata } from '@/lib/ingest/normalizeMetadata';
import { downloadAndStorePdf } from '@/lib/import/downloadPdf';
import { detectPdfUrl, fetchMetadataFromDoi, isSafeHttpUrl } from '@/lib/import/resolve';
import { enforceAdminWriteLimit, enforceIngestLimit } from '@/lib/ratelimit/enforce';

export const runtime = 'nodejs';

type CommitBody = {
  universeId?: string;
  value?: string;
  enqueue?: boolean;
};

type DocumentRow = {
  id: string;
  universe_id: string;
  title: string;
  status: 'uploaded' | 'processed' | 'link_only' | 'error';
  storage_path: string | null;
  source_url: string | null;
  doi: string | null;
  is_deleted: boolean;
};

function normalizeInput(value: unknown) {
  return String(value ?? '').trim();
}

function isDoiInput(value: string) {
  if (/^https?:\/\/(dx\.)?doi\.org\//i.test(value)) return true;
  return /^10\.\d{4,9}\//.test(value.trim());
}

async function ensureDocsBucket() {
  const db = getAdminDb();
  if (!db) return null;

  const { data: bucket } = await db.storage.getBucket('cv-docs');
  if (bucket) return db;
  await db.storage.createBucket('cv-docs', {
    public: false,
    fileSizeLimit: '50MB',
    allowedMimeTypes: ['application/pdf'],
  });
  return db;
}

async function resolveImportMetadata(value: string) {
  const inputType = isDoiInput(value) ? 'doi' : 'url';
  if (inputType === 'url' && !isSafeHttpUrl(value)) {
    return { error: 'unsafe_or_invalid_url' as const };
  }

  if (inputType === 'doi') {
    const meta = await fetchMetadataFromDoi(value);
    const pdfDetection = await detectPdfUrl(meta.resolvedUrl ?? meta.sourceUrl ?? null);
    return {
      inputType,
      pdfDetected: pdfDetection.isPdf,
      normalized: normalizeImportMetadata({
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
      }),
    };
  }

  const pdfDetection = await detectPdfUrl(value);
  return {
    inputType,
    pdfDetected: pdfDetection.isPdf,
    normalized: normalizeImportMetadata({
      title: value,
      sourceUrl: value,
      pdfUrl: pdfDetection.isPdf ? (pdfDetection.finalUrl ?? value) : undefined,
      importSource: 'url',
      kind: 'url',
    }),
  };
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(session.role === 'admin' || session.role === 'editor')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: CommitBody = {};
  try {
    body = (await request.json()) as CommitBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const universeId = normalizeInput(body.universeId);
  const value = normalizeInput(body.value);
  const autoEnqueue = body.enqueue === true;
  if (!universeId || !value) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const adminRl = await enforceAdminWriteLimit(session.userId, `api/admin/import/commit/${universeId}`);
  if (!adminRl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: adminRl.retryAfterSec },
      { status: 429 },
    );
  }

  const db = await ensureDocsBucket();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const resolved = await resolveImportMetadata(value);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const normalized = resolved.normalized;
  const pdfDetected = resolved.pdfDetected;
  let existingDoc: DocumentRow | null = null;

  if (normalized.doi) {
    const { data } = await db
      .from('documents')
      .select('id, universe_id, title, status, storage_path, source_url, doi, is_deleted')
      .eq('universe_id', universeId)
      .eq('doi', normalized.doi)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();
    existingDoc = (data as DocumentRow | null) ?? null;
  }

  if (!existingDoc && normalized.sourceUrl) {
    const { data } = await db
      .from('documents')
      .select('id, universe_id, title, status, storage_path, source_url, doi, is_deleted')
      .eq('universe_id', universeId)
      .eq('source_url', normalized.sourceUrl)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();
    existingDoc = (data as DocumentRow | null) ?? null;
  }

  let document: DocumentRow | null = existingDoc;
  if (!document) {
    const { data, error } = await db
      .from('documents')
      .insert({
        universe_id: universeId,
        title: normalized.title,
        authors: normalized.authors,
        year: normalized.year,
        journal: normalized.journal,
        abstract: normalized.abstract,
        doi: normalized.doi,
        source_url: normalized.sourceUrl,
        pdf_url: normalized.pdfUrl,
        import_source: normalized.importSource,
        kind: normalized.kind,
        status: pdfDetected ? 'uploaded' : 'link_only',
        storage_path: null,
        is_deleted: false,
      })
      .select('id, universe_id, title, status, storage_path, source_url, doi, is_deleted')
      .maybeSingle();
    if (error || !data) {
      const fallbackQuery = normalized.doi
        ? db
            .from('documents')
            .select('id, universe_id, title, status, storage_path, source_url, doi, is_deleted')
            .eq('universe_id', universeId)
            .eq('doi', normalized.doi)
            .eq('is_deleted', false)
            .limit(1)
            .maybeSingle()
        : normalized.sourceUrl
          ? db
              .from('documents')
              .select('id, universe_id, title, status, storage_path, source_url, doi, is_deleted')
              .eq('universe_id', universeId)
              .eq('source_url', normalized.sourceUrl)
              .eq('is_deleted', false)
              .limit(1)
              .maybeSingle()
          : null;
      if (fallbackQuery) {
        const { data: existing } = await fallbackQuery;
        if (existing) {
          document = existing as DocumentRow;
        }
      }
      if (!document) {
        return NextResponse.json({ error: 'create_document_failed' }, { status: 500 });
      }
    } else {
      document = data as DocumentRow;
    }
  } else {
    const nextStatus = document.status === 'processed' ? 'processed' : pdfDetected ? 'uploaded' : 'link_only';
    const { data } = await db
      .from('documents')
      .update({
        title: normalized.title || document.title,
        authors: normalized.authors,
        year: normalized.year,
        journal: normalized.journal,
        abstract: normalized.abstract,
        doi: normalized.doi ?? document.doi,
        source_url: normalized.sourceUrl ?? document.source_url,
        pdf_url: normalized.pdfUrl,
        import_source: normalized.importSource,
        kind: normalized.kind,
        status: nextStatus,
      })
      .eq('id', document.id)
      .select('id, universe_id, title, status, storage_path, source_url, doi, is_deleted')
      .maybeSingle();
    if (data) {
      document = data as DocumentRow;
    }
  }

  if (!document) {
    return NextResponse.json({ error: 'document_resolution_failed' }, { status: 500 });
  }

  let importMode: 'pdf' | 'link_only' = 'link_only';
  let importWarning: string | null = null;
  if (pdfDetected && normalized.pdfUrl) {
    const downloadResult = await downloadAndStorePdf({
      universeId,
      documentId: document.id,
      pdfUrl: normalized.pdfUrl,
      maxBytes: 50 * 1024 * 1024,
      timeoutMs: 20000,
    });

    if (downloadResult.ok && downloadResult.storagePath) {
      const { data } = await db
        .from('documents')
        .update({
          storage_path: downloadResult.storagePath,
          status: document.status === 'processed' ? 'processed' : 'uploaded',
          pdf_url: normalized.pdfUrl,
          source_url: normalized.sourceUrl,
        })
        .eq('id', document.id)
        .select('id, universe_id, title, status, storage_path, source_url, doi, is_deleted')
        .maybeSingle();
      if (data) {
        document = data as DocumentRow;
      }
      importMode = 'pdf';
    } else {
      importWarning = downloadResult.errorCode ?? 'pdf_download_failed';
      const { data } = await db
        .from('documents')
        .update({
          status: document.status === 'processed' ? 'processed' : 'link_only',
          pdf_url: normalized.pdfUrl,
          source_url: normalized.sourceUrl,
        })
        .eq('id', document.id)
        .select('id, universe_id, title, status, storage_path, source_url, doi, is_deleted')
        .maybeSingle();
      if (data) {
        document = data as DocumentRow;
      }
    }
  }

  let queued = false;
  if (autoEnqueue && document.status === 'uploaded') {
    const ingestRl = await enforceIngestLimit(session.userId);
    if (ingestRl.ok) {
      await enqueueIngestJob({ universeId, documentId: document.id });
      queued = true;
    }
  }

  return NextResponse.json({
    ok: true,
    importMode,
    queued,
    warning: importWarning,
    document: {
      id: document.id,
      title: document.title,
      status: document.status,
      storagePath: document.storage_path,
      sourceUrl: document.source_url,
      doi: document.doi,
      createdOrUpdatedAt: new Date().toISOString(),
    },
  });
}
