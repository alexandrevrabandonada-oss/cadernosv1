import 'server-only';
import { getAdminDb } from '@/lib/admin/db';
import { buildChunksFromPages } from '@/lib/ingest/chunk';
import { extractPdfPages } from '@/lib/ingest/pdf';
import { analyzePages, dedupeRepeatedLines, scoreQuality } from '@/lib/ingest/quality';
import { resolveIngestPreset, type IngestPresetName } from '@/lib/ingest/presets';
import { generateEmbeddings, toVectorLiteral } from '@/lib/search/embeddings';

type IngestResult = {
  ok: boolean;
  documentId: string;
  chunksCreated: number;
  qualityScore: number | null;
  flags: string[];
  presetUsed: IngestPresetName;
  error?: string;
};

type ProcessOptions = {
  preset?: IngestPresetName;
  jobKind?: 'process' | 'reprocess';
};

async function logIngest(
  universeId: string,
  documentId: string | null,
  level: 'info' | 'error',
  message: string,
  details: Record<string, unknown> = {},
) {
  const db = getAdminDb();
  if (!db) return;

  const allowed = [
    'reason',
    'chunksCreated',
    'pagesFound',
    'processed',
    'failed',
    'total',
    'qualityScore',
    'qualityFlags',
    'emptyPagesCount',
    'pagesCount',
    'preset',
    'jobKind',
  ] as const;
  const safeDetails: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in details) safeDetails[key] = details[key];
  }

  await db.from('ingest_logs').insert({
    universe_id: universeId,
    document_id: documentId,
    level,
    message,
    details: safeDetails,
    kind: 'quality_pass',
    ok: level === 'info',
  });
}

function truncateLines(lines: string[]) {
  return lines.map((line) => line.slice(0, 90)).slice(0, 5);
}

export async function processDocument(
  universeId: string,
  documentId: string,
  options: ProcessOptions = {},
): Promise<IngestResult> {
  const db = getAdminDb();
  const presetName = options.preset ?? 'default';
  const preset = resolveIngestPreset(presetName);
  const jobKind = options.jobKind ?? 'process';

  if (!db) {
    return {
      ok: false,
      documentId,
      chunksCreated: 0,
      qualityScore: null,
      flags: [],
      presetUsed: preset.name,
      error: 'Admin DB not configured',
    };
  }

  try {
    const { data: document, error: documentError } = await db
      .from('documents')
      .select('id, title, storage_path, status, ingest_preset')
      .eq('id', documentId)
      .eq('universe_id', universeId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (documentError || !document) {
      await logIngest(universeId, documentId, 'error', 'Documento nao encontrado para ingestao', {
        reason: 'document_not_found',
      });
      return {
        ok: false,
        documentId,
        chunksCreated: 0,
        qualityScore: null,
        flags: [],
        presetUsed: preset.name,
        error: 'Document not found',
      };
    }

    if (!document.storage_path) {
      await logIngest(universeId, documentId, 'error', 'Documento sem storage_path', {});
      return {
        ok: false,
        documentId,
        chunksCreated: 0,
        qualityScore: null,
        flags: [],
        presetUsed: preset.name,
        error: 'Missing storage_path',
      };
    }

    const effectivePreset = resolveIngestPreset(options.preset ?? document.ingest_preset ?? 'default');

    const { data: fileBlob, error: downloadError } = await db.storage.from('cv-docs').download(document.storage_path);
    if (downloadError || !fileBlob) {
      await logIngest(universeId, documentId, 'error', 'Falha no download do PDF do storage', {
        reason: 'storage_download_failed',
      });
      return {
        ok: false,
        documentId,
        chunksCreated: 0,
        qualityScore: null,
        flags: [],
        presetUsed: effectivePreset.name,
        error: 'Storage download failed',
      };
    }

    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    const extractedPages = await extractPdfPages(fileBuffer);
    const metrics = analyzePages(extractedPages);
    const dedupedPages = dedupeRepeatedLines(extractedPages, metrics.repeatedLinesTop, effectivePreset.dedupeMode);
    const preparedChunks = buildChunksFromPages(dedupedPages, effectivePreset.chunk);
    const qualityScore = scoreQuality(metrics);

    await db.from('chunks').update({ archived: true }).eq('document_id', documentId).eq('archived', false);

    let insertedChunkIds: string[] = [];
    if (preparedChunks.length > 0) {
      const payload = preparedChunks.map((chunk) => ({
        document_id: documentId,
        universe_id: universeId,
        page_start: chunk.page_start,
        page_end: chunk.page_end,
        text: chunk.text,
        archived: false,
      }));
      const { data: insertedChunks } = await db.from('chunks').insert(payload).select('id, text');
      insertedChunkIds = (insertedChunks ?? []).map((chunk) => chunk.id);

      const texts = (insertedChunks ?? []).map((chunk) => chunk.text);
      const embeddings = await generateEmbeddings(texts);
      for (let i = 0; i < (insertedChunks ?? []).length; i += 1) {
        const chunk = insertedChunks?.[i];
        const embedding = embeddings[i];
        if (!chunk || !embedding) continue;
        await db.from('chunks').update({ embedding: toVectorLiteral(embedding) }).eq('id', chunk.id);
      }
    }

    await db.from('document_pages_quality').delete().eq('document_id', documentId);
    if (metrics.pageRows.length > 0) {
      await db.from('document_pages_quality').insert(
        metrics.pageRows.map((row) => ({
          document_id: documentId,
          page_number: row.pageNumber,
          char_count: row.charCount,
          word_count: row.wordCount,
          is_empty: row.isEmpty,
          repeat_signature: row.repeatSignature,
        })),
      );
    }

    await db
      .from('documents')
      .update({
        status: 'processed',
        pages_count: metrics.pagesCount,
        empty_pages_count: metrics.emptyPagesCount,
        repeated_lines_top: truncateLines(metrics.repeatedLinesTop),
        text_quality_flags: metrics.flags,
        text_quality_score: qualityScore,
        ingest_preset: effectivePreset.name,
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('universe_id', universeId);

    await logIngest(universeId, documentId, 'info', 'Documento processado com quality pass', {
      chunksCreated: insertedChunkIds.length,
      pagesFound: metrics.pagesCount,
      qualityScore,
      qualityFlags: metrics.flags,
      emptyPagesCount: metrics.emptyPagesCount,
      pagesCount: metrics.pagesCount,
      preset: effectivePreset.name,
      jobKind,
    });

    return {
      ok: true,
      documentId,
      chunksCreated: insertedChunkIds.length,
      qualityScore,
      flags: metrics.flags,
      presetUsed: effectivePreset.name,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingest error';
    await logIngest(universeId, documentId, 'error', 'Erro inesperado na ingestao', {
      reason: 'unexpected_error',
      preset: presetName,
      jobKind,
    });
    return {
      ok: false,
      documentId,
      chunksCreated: 0,
      qualityScore: null,
      flags: [],
      presetUsed: preset.name,
      error: message,
    };
  }
}

export async function processAllDocuments(universeId: string, options: ProcessOptions = {}) {
  const db = getAdminDb();
  if (!db) {
    return { processed: 0, failed: 0, chunksCreated: 0 };
  }

  const { data: docs } = await db
    .from('documents')
    .select('id')
    .eq('universe_id', universeId)
    .eq('is_deleted', false)
    .not('storage_path', 'is', null);

  const list = docs ?? [];
  let processed = 0;
  let failed = 0;
  let chunksCreated = 0;

  for (const doc of list) {
    const result = await processDocument(universeId, doc.id, options);
    if (result.ok) {
      processed += 1;
      chunksCreated += result.chunksCreated;
    } else {
      failed += 1;
    }
  }

  await logIngest(universeId, null, 'info', 'Processamento em lote concluido', {
    processed,
    failed,
    chunksCreated,
    total: list.length,
    preset: options.preset ?? 'default',
  });

  return { processed, failed, chunksCreated };
}
