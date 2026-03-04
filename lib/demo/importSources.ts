import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAdminDb } from '@/lib/admin/db';
import type { DemoSourceValidated, DemoSourcesValidationResult } from '@/lib/demo/validateSources';

type ImportEntryResult = {
  index: number;
  kind: string;
  value: string;
  status: 'created' | 'updated' | 'ignored' | 'error';
  reason: string;
  documentId?: string;
  uploaded?: boolean;
};

export type DemoImportResult = {
  ok: boolean;
  universeId: string;
  universeSlug: string;
  totals: {
    processed: number;
    created: number;
    updated: number;
    ignored: number;
    errors: number;
    uploaded: number;
    linkOnly: number;
    nodeLinks: number;
  };
  entries: ImportEntryResult[];
  reportPath: string;
};

type UniverseNode = {
  id: string;
  slug: string;
};

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

function entryTitle(entry: DemoSourceValidated, index: number) {
  if (entry.note) return `[DEMO] ${entry.note.slice(0, 130)}`;
  if (entry.kind === 'doi') return `[DEMO] DOI ${entry.normalizedValue}`;
  if (entry.kind === 'url') return `[DEMO] URL ${entry.normalizedValue}`;
  return `[DEMO] PDF local ${index + 1}`;
}

async function findExistingDocumentId(universeId: string, entry: DemoSourceValidated) {
  const db = getAdminDb();
  if (!db) return null;
  if (entry.kind === 'doi') {
    const { data } = await db
      .from('documents')
      .select('id')
      .eq('universe_id', universeId)
      .eq('doi', entry.normalizedValue)
      .eq('is_deleted', false)
      .maybeSingle();
    return data?.id ?? null;
  }
  if (entry.kind === 'url') {
    const { data } = await db
      .from('documents')
      .select('id')
      .eq('universe_id', universeId)
      .eq('source_url', entry.normalizedValue)
      .eq('is_deleted', false)
      .maybeSingle();
    return data?.id ?? null;
  }
  const marker = `demo-local-pdf:${entry.normalizedValue}`;
  const { data } = await db
    .from('documents')
    .select('id')
    .eq('universe_id', universeId)
    .eq('import_source', marker)
    .eq('is_deleted', false)
    .maybeSingle();
  return data?.id ?? null;
}

async function uploadLocalPdf(universeId: string, documentId: string, sourcePath: string) {
  const db = await ensureDocsBucket();
  if (!db) return { ok: false as const, reason: 'supabase_storage_unavailable' };

  const absolutePath = path.resolve(process.cwd(), sourcePath.replace(/^\.\/+/, ''));
  try {
    await fs.access(absolutePath);
  } catch {
    return { ok: false as const, reason: `pdf_not_found:${sourcePath}` };
  }

  const buffer = await fs.readFile(absolutePath);
  const objectPath = `universes/${universeId}/imports/${documentId}.pdf`;
  const { error } = await db.storage.from('cv-docs').upload(objectPath, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) return { ok: false as const, reason: `storage_error:${error.message}` };

  await db
    .from('documents')
    .update({
      storage_path: objectPath,
      status: 'uploaded',
      pdf_url: null,
    })
    .eq('id', documentId);

  return { ok: true as const, reason: 'uploaded' };
}

async function upsertNodeLinks(universeId: string, documentId: string, nodeMap: Map<string, UniverseNode>, entry: DemoSourceValidated) {
  const db = getAdminDb();
  if (!db) return 0;
  let links = 0;
  for (let i = 0; i < entry.matchedNodeSlugs.length; i += 1) {
    const slug = entry.matchedNodeSlugs[i];
    const node = nodeMap.get(slug);
    if (!node) continue;
    const weight = Math.max(80, 260 - i * 20);
    await db.from('node_documents').upsert(
      {
        universe_id: universeId,
        node_id: node.id,
        document_id: documentId,
        weight,
        note: 'Vinculo automatico por tags (console demo).',
      },
      { onConflict: 'node_id,document_id' },
    );
    links += 1;
  }
  return links;
}

export function buildDemoImportReportMarkdown(input: {
  universeSlug: string;
  validation: DemoSourcesValidationResult;
  importResult: DemoImportResult;
}) {
  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push('# Import Demo — Poluicao VR');
  lines.push(`Data: ${now}`);
  lines.push(`Universo: ${input.universeSlug}`);
  lines.push('');
  lines.push('## Resumo');
  lines.push(`- Total de entradas no JSON: ${input.validation.stats.total}`);
  lines.push(`- Placeholders detectados: ${input.validation.stats.placeholders}`);
  lines.push(`- Duplicadas: ${input.validation.stats.duplicates}`);
  lines.push(`- PDFs locais ausentes: ${input.validation.stats.missingLocalPdfs}`);
  lines.push(`- Importadas (criadas): ${input.importResult.totals.created}`);
  lines.push(`- Atualizadas: ${input.importResult.totals.updated}`);
  lines.push(`- Ignoradas: ${input.importResult.totals.ignored}`);
  lines.push(`- Erros: ${input.importResult.totals.errors}`);
  lines.push(`- Uploads PDF (status uploaded): ${input.importResult.totals.uploaded}`);
  lines.push(`- Link-only: ${input.importResult.totals.linkOnly}`);
  lines.push(`- Vinculos node_documents criados/confirmados: ${input.importResult.totals.nodeLinks}`);
  lines.push('');

  lines.push('## Validacao (primeiros 30)');
  const validationIssues = [...input.validation.errors, ...input.validation.warnings].slice(0, 30);
  if (validationIssues.length === 0) {
    lines.push('- Sem erros/avisos na validacao.');
  } else {
    for (const issue of validationIssues) {
      lines.push(`- [${issue.level.toUpperCase()}] #${issue.index + 1} ${issue.code}: ${issue.message}`);
    }
  }
  lines.push('');

  lines.push('## Resultado por entrada (primeiras 40)');
  const rows = input.importResult.entries.slice(0, 40);
  if (rows.length === 0) {
    lines.push('- Nenhuma entrada processada.');
  } else {
    for (const row of rows) {
      lines.push(`- #${row.index + 1} [${row.status}] ${row.kind} ${row.value} — ${row.reason}`);
    }
  }
  lines.push('');

  lines.push('## Proximos passos');
  lines.push('- Substituir placeholders restantes em `data/demo/poluicao-vr.sources.json`.');
  lines.push('- Subir PDFs locais faltantes em `data/demo/pdfs/` para reduzir `link_only`.');
  lines.push('- Enfileirar ingest (`uploaded`) e rodar worker em lotes curtos.');
  lines.push('- Abrir /admin/universes/[id]/assistido para promover evidencias reais.');
  lines.push('- Abrir /admin/universes/[id]/checklist para fechar lacunas de publicacao.');
  lines.push('');

  return lines.join('\n');
}

export async function runDemoImportForUniverse(input: {
  universeId: string;
  universeSlug: string;
  validation: DemoSourcesValidationResult;
}): Promise<DemoImportResult> {
  const db = getAdminDb();
  if (!db) {
    return {
      ok: false,
      universeId: input.universeId,
      universeSlug: input.universeSlug,
      totals: { processed: 0, created: 0, updated: 0, ignored: 0, errors: 0, uploaded: 0, linkOnly: 0, nodeLinks: 0 },
      entries: [{ index: 0, kind: 'n/a', value: '', status: 'error', reason: 'supabase_unavailable' }],
      reportPath: path.resolve(process.cwd(), 'reports/demo_poluicao_vr_import.md'),
    };
  }

  const { data: nodeRows } = await db
    .from('nodes')
    .select('id, slug')
    .eq('universe_id', input.universeId);
  const nodeMap = new Map<string, UniverseNode>((nodeRows ?? []).map((row) => [row.slug, row]));
  const uniqueEntries = input.validation.entries.filter((entry) => !entry.duplicate);

  const result: DemoImportResult = {
    ok: true,
    universeId: input.universeId,
    universeSlug: input.universeSlug,
    totals: { processed: 0, created: 0, updated: 0, ignored: 0, errors: 0, uploaded: 0, linkOnly: 0, nodeLinks: 0 },
    entries: [],
    reportPath: path.resolve(process.cwd(), 'reports/demo_poluicao_vr_import.md'),
  };

  for (let index = 0; index < uniqueEntries.length; index += 1) {
    const entry = uniqueEntries[index];
    result.totals.processed += 1;
    const existingId = await findExistingDocumentId(input.universeId, entry);
    const title = entryTitle(entry, index);
    const docPayload = {
      universe_id: input.universeId,
      title,
      kind: entry.kind === 'pdf' ? 'upload' : entry.kind,
      import_source: entry.kind === 'pdf' ? `demo-local-pdf:${entry.normalizedValue}` : 'demo-import-sources',
      abstract: entry.note || null,
      status: 'link_only',
      doi: entry.kind === 'doi' ? entry.normalizedValue : null,
      source_url:
        entry.kind === 'doi'
          ? `https://doi.org/${entry.normalizedValue}`
          : entry.kind === 'url'
            ? entry.normalizedValue
            : null,
      pdf_url:
        entry.kind === 'url' && entry.normalizedValue.toLowerCase().endsWith('.pdf') ? entry.normalizedValue : null,
      is_deleted: false,
    };

    const response = existingId
      ? await db.from('documents').update(docPayload).eq('id', existingId).select('id').maybeSingle()
      : await db.from('documents').insert(docPayload).select('id').maybeSingle();

    const documentId = response.data?.id ?? existingId;
    if (!documentId) {
      result.ok = false;
      result.totals.errors += 1;
      result.entries.push({
        index,
        kind: entry.kind,
        value: entry.value,
        status: 'error',
        reason: response.error?.message ?? 'document_upsert_failed',
      });
      continue;
    }

    if (existingId) result.totals.updated += 1;
    else result.totals.created += 1;

    let uploaded = false;
    if (entry.kind === 'pdf' && entry.localPdfExists) {
      const upload = await uploadLocalPdf(input.universeId, documentId, entry.normalizedValue);
      if (upload.ok) {
        uploaded = true;
        result.totals.uploaded += 1;
      } else {
        result.totals.linkOnly += 1;
      }
    } else {
      result.totals.linkOnly += 1;
    }

    const links = await upsertNodeLinks(input.universeId, documentId, nodeMap, entry);
    result.totals.nodeLinks += links;

    result.entries.push({
      index,
      kind: entry.kind,
      value: entry.value,
      status: existingId ? 'updated' : 'created',
      reason: uploaded ? 'imported_with_pdf' : 'imported_link_only',
      documentId,
      uploaded,
    });
  }

  const duplicateCount = input.validation.entries.length - uniqueEntries.length;
  if (duplicateCount > 0) {
    result.totals.ignored += duplicateCount;
  }

  const report = buildDemoImportReportMarkdown({
    universeSlug: input.universeSlug,
    validation: input.validation,
    importResult: result,
  });
  await fs.writeFile(result.reportPath, report, 'utf8');

  return result;
}

