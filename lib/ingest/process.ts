import 'server-only';
import { getAdminDb } from '@/lib/admin/db';
import { buildChunksFromPages } from '@/lib/ingest/chunk';
import { extractPdfPages } from '@/lib/ingest/pdf';
import { generateEmbeddings, toVectorLiteral } from '@/lib/search/embeddings';

type IngestResult = {
  ok: boolean;
  documentId: string;
  chunksCreated: number;
  error?: string;
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

  const allowed = ['reason', 'chunksCreated', 'pagesFound', 'processed', 'failed', 'total'] as const;
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
  });
}

export async function processDocument(universeId: string, documentId: string): Promise<IngestResult> {
  const db = getAdminDb();
  if (!db) {
    return { ok: false, documentId, chunksCreated: 0, error: 'Admin DB not configured' };
  }

  try {
    const { data: document, error: documentError } = await db
      .from('documents')
      .select('id, title, storage_path')
      .eq('id', documentId)
      .eq('universe_id', universeId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (documentError || !document) {
      await logIngest(universeId, documentId, 'error', 'Documento nao encontrado para ingestao', {
        reason: 'document_not_found',
      });
      return { ok: false, documentId, chunksCreated: 0, error: 'Document not found' };
    }

    if (!document.storage_path) {
      await logIngest(universeId, documentId, 'error', 'Documento sem storage_path', {});
      return { ok: false, documentId, chunksCreated: 0, error: 'Missing storage_path' };
    }

    const { data: fileBlob, error: downloadError } = await db
      .storage
      .from('cv-docs')
      .download(document.storage_path);

    if (downloadError || !fileBlob) {
      await logIngest(universeId, documentId, 'error', 'Falha no download do PDF do storage', {
        reason: 'storage_download_failed',
      });
      return { ok: false, documentId, chunksCreated: 0, error: 'Storage download failed' };
    }

    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    const pages = await extractPdfPages(fileBuffer);
    const preparedChunks = buildChunksFromPages(pages);

    await db.from('chunks').delete().eq('document_id', documentId);

    if (preparedChunks.length > 0) {
      const payload = preparedChunks.map((chunk) => ({
        document_id: documentId,
        universe_id: universeId,
        page_start: chunk.page_start,
        page_end: chunk.page_end,
        text: chunk.text,
      }));
      const { data: insertedChunks } = await db
        .from('chunks')
        .insert(payload)
        .select('id, text');

      const texts = (insertedChunks ?? []).map((chunk) => chunk.text);
      const embeddings = await generateEmbeddings(texts);

      for (let i = 0; i < (insertedChunks ?? []).length; i += 1) {
        const chunk = insertedChunks?.[i];
        const embedding = embeddings[i];
        if (!chunk || !embedding) continue;

        await db
          .from('chunks')
          .update({ embedding: toVectorLiteral(embedding) })
          .eq('id', chunk.id);
      }
    }

    await db
      .from('documents')
      .update({ status: 'processed' })
      .eq('id', documentId)
      .eq('universe_id', universeId);

    await logIngest(universeId, documentId, 'info', 'Documento processado com sucesso', {
      chunksCreated: preparedChunks.length,
      pagesFound: pages.length,
    });

    return { ok: true, documentId, chunksCreated: preparedChunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingest error';
    await logIngest(universeId, documentId, 'error', 'Erro inesperado na ingestao', {
      reason: 'unexpected_error',
    });
    return { ok: false, documentId, chunksCreated: 0, error: message };
  }
}

export async function processAllDocuments(universeId: string) {
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
    const result = await processDocument(universeId, doc.id);
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
  });

  return { processed, failed, chunksCreated };
}
