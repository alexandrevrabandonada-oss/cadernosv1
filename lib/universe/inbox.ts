import 'server-only';
import { randomUUID } from 'crypto';
import { enqueueIngestJob } from '@/lib/ingest/jobs';
import { EDITORIAL_PROGRAM_2026 } from '@/lib/editorial/programBatch';
import { addUniverseToProgram, createEditorialProgram, getEditorialProgram, type EditorialLane } from '@/lib/editorial/program';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { bootstrapUniverseWorkflow } from '@/lib/universe/bootstrap';
import { getUniverseBootstrapTemplate, type UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';

const PDF_MIME = 'application/pdf';
const STOPWORDS = new Set([
  'about','above','after','again','ainda','among','antes','apenas','aqui','areas','assim','between','como','com','contra','quando','depois',
  'desde','document','documento','dos','das','essa','esse','esta','este','foram','from','have','isso','mais','menos','muito','muitas','muitos',
  'para','pela','pelas','pelo','pelos','por','sobre','their','them','then','there','these','this','through','under','uma','umas','uns','with',
  'without','your','yours','that','those','what','when','where','which','while','estudo','relatorio','report','nota','notas','analise','analysis'
]);

type TemplateId = UniverseBootstrapTemplateId;

type InboxItemAnalysis = {
  extractedTitle: string;
  previewExcerpt: string;
  textLength: number;
  pageCount: number;
  topKeywords: string[];
  dominantTemplate: TemplateId;
  templateScores: Record<TemplateId, number>;
  lowText: boolean;
};

export type UniverseInboxItem = {
  id: string;
  batchId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string | null;
  extractedTitle: string | null;
  previewExcerpt: string | null;
  status: 'uploaded' | 'analyzed' | 'queued' | 'attached' | 'error';
  analysis: InboxItemAnalysis;
  createdAt: string;
};

export type UniverseInboxSuggestion = {
  title: string;
  slug: string;
  summary: string;
  templateId: TemplateId;
  confidence: number;
  warnings: string[];
  tags: string[];
  subthemes: string[];
  coreNodes: Array<{ slug: string; title: string; summary: string; tags: string[] }>;
  glossary: Array<{ term: string; shortDef: string; body: string; tags: string[] }>;
  questions: string[];
  trail: { title: string; summary: string; steps: string[] };
};

export type UniverseInboxBatch = {
  id: string;
  createdBy: string | null;
  status: 'draft' | 'analyzed' | 'created' | 'archived';
  title: string | null;
  slug: string | null;
  summary: string | null;
  suggestedTemplate: TemplateId | null;
  confidence: number;
  warning: string | null;
  createdUniverseId: string | null;
  analysis: UniverseInboxSuggestion;
  items: UniverseInboxItem[];
  createdAt: string;
  updatedAt: string;
};

type StoredBatchRow = {
  id: string;
  created_by: string | null;
  status: UniverseInboxBatch['status'];
  title: string | null;
  slug: string | null;
  summary: string | null;
  suggested_template: TemplateId | null;
  confidence: number | string | null;
  warning: string | null;
  analysis: UniverseInboxSuggestion | null;
  created_universe_id: string | null;
  created_at: string;
  updated_at: string;
};

type StoredItemRow = {
  id: string;
  batch_id: string;
  file_name: string;
  file_size: number | string;
  mime_type: string;
  storage_path: string | null;
  extracted_title: string | null;
  preview_excerpt: string | null;
  status: UniverseInboxItem['status'];
  analysis: InboxItemAnalysis | null;
  created_at: string;
};

type MockState = {
  batches: UniverseInboxBatch[];
};

const mockState = ((globalThis as typeof globalThis & { __cvInboxState?: MockState }).__cvInboxState) ?? { batches: [] };
(globalThis as typeof globalThis & { __cvInboxState?: MockState }).__cvInboxState = mockState;

function shouldUseMockInbox() {
  return process.env.TEST_SEED === '1' || !getSupabaseServiceRoleClient();
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function sanitizeFileName(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function takeTopKeywords(text: string, limit = 12) {
  const counts = new Map<string, number>();
  const normalized = normalizeText(text).replace(/[^a-z0-9\s-]+/g, ' ');
  for (const token of normalized.split(/\s+/)) {
    if (token.length < 4 || STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function scoreTemplate(keywords: string[]): Record<TemplateId, number> {
  const haystack = new Set(keywords);
  const scores: Record<TemplateId, number> = {
    blank_minimal: 1,
    issue_investigation: 0,
    territorial_memory: 0,
    campaign_watch: 0,
  };

  const boosts: Array<[TemplateId, string[]]> = [
    ['issue_investigation', ['saude', 'poluicao', 'impacto', 'ambiental', 'evidencia', 'contaminacao', 'trabalho', 'risco', 'monitoramento', 'empresa']],
    ['territorial_memory', ['territorio', 'memoria', 'bairro', 'historia', 'urbano', 'cidade', 'patrimonio', 'ocupacao', 'comunidade', 'industrial']],
    ['campaign_watch', ['campanha', 'agenda', 'semana', 'clipping', 'sinais', 'monitoramento', 'boletim', 'resposta', 'debate', 'alerta']],
  ];

  for (const [templateId, words] of boosts) {
    for (const word of words) {
      if (haystack.has(word)) scores[templateId] += 3;
    }
  }

  if (keywords.length >= 6) scores.blank_minimal = 0;
  return scores;
}

function pickTemplateFromScores(scores: Record<TemplateId, number>): TemplateId {
  return (Object.entries(scores).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? 'blank_minimal') as TemplateId;
}

function deriveTitleFromFilename(fileName: string) {
  return titleCase(
    fileName
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

async function analyzePdfFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText = '';
  let pageCount = 0;
  try {
    const { extractPdfPages } = await import('@/lib/ingest/pdf');
    const pages = await extractPdfPages(buffer);
    extractedText = pages.map((page) => page.text).join('\n\n').trim();
    pageCount = pages.length;
  } catch {
    extractedText = '';
    pageCount = 0;
  }

  const titleFromText = extractedText
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && line.length <= 120) ?? deriveTitleFromFilename(file.name);
  const previewExcerpt = (extractedText || deriveTitleFromFilename(file.name)).slice(0, 280);
  const topKeywords = takeTopKeywords(`${file.name} ${extractedText}`);
  const templateScores = scoreTemplate(topKeywords);
  const lowText = extractedText.length < 180;

  return {
    buffer,
    analysis: {
      extractedTitle: titleFromText,
      previewExcerpt,
      textLength: extractedText.length,
      pageCount,
      topKeywords,
      dominantTemplate: pickTemplateFromScores(templateScores),
      templateScores,
      lowText,
    } satisfies InboxItemAnalysis,
  };
}

function aggregateKeywords(items: UniverseInboxItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const keyword of item.analysis.topKeywords) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([keyword, count]) => ({ keyword, count }));
}

export function clusterBatchByTheme(items: UniverseInboxItem[]) {
  const templateBuckets = new Map<TemplateId, UniverseInboxItem[]>();
  for (const item of items) {
    const bucket = templateBuckets.get(item.analysis.dominantTemplate) ?? [];
    bucket.push(item);
    templateBuckets.set(item.analysis.dominantTemplate, bucket);
  }

  const clusters = [...templateBuckets.entries()]
    .map(([templateId, clusterItems]) => ({
      templateId,
      size: clusterItems.length,
      label: titleCase(aggregateKeywords(clusterItems).slice(0, 3).map((entry) => entry.keyword).join(' ')) || 'Recorte complementar',
    }))
    .sort((a, b) => b.size - a.size);

  const mixedThemes = clusters.length > 1 && items.length >= 3 && clusters[1]!.size >= Math.max(1, Math.floor(items.length * 0.34));
  return { mixedThemes, clusters: clusters.slice(0, 2) };
}

export function suggestUniverseTemplate(items: UniverseInboxItem[]): TemplateId {
  const totals: Record<TemplateId, number> = {
    blank_minimal: 0,
    issue_investigation: 0,
    territorial_memory: 0,
    campaign_watch: 0,
  };
  let lowTextCount = 0;
  for (const item of items) {
    if (item.analysis.lowText) lowTextCount += 1;
    for (const [templateId, score] of Object.entries(item.analysis.templateScores) as Array<[TemplateId, number]>) {
      totals[templateId] += score;
    }
  }

  const topKeywords = aggregateKeywords(items).slice(0, 6);
  if (topKeywords.length < 4 || (items.length > 0 && lowTextCount === items.length)) {
    return 'blank_minimal';
  }

  return pickTemplateFromScores(totals);
}

function buildSuggestedTitle(templateId: TemplateId, topKeywords: string[]) {
  const focus = titleCase(topKeywords.slice(0, 3).join(' ')).trim();
  if (templateId === 'issue_investigation') return focus ? `${focus} em foco` : 'Investigacao em foco';
  if (templateId === 'territorial_memory') return focus ? `Memoria de ${focus}` : 'Memoria viva do territorio';
  if (templateId === 'campaign_watch') return focus ? `${focus} Monitoramento` : 'Monitoramento em curso';
  return focus || 'Novo universo';
}

function buildSuggestedSummary(templateId: TemplateId, topKeywords: string[]) {
  const focus = topKeywords.slice(0, 5).join(', ');
  if (templateId === 'issue_investigation') {
    return `Universo sugerido a partir de um lote documental com foco em ${focus || 'impactos, atores e evidencias'}. Estrutura inicial pensada para abrir contexto, disputas, respostas e monitoramento.`;
  }
  if (templateId === 'territorial_memory') {
    return `Universo sugerido para organizar memoria, territorio e marcos historicos em torno de ${focus || 'lugares, acervos e narrativas locais'}.`;
  }
  if (templateId === 'campaign_watch') {
    return `Universo sugerido para monitoramento continuo, clipping e sinais quentes ligados a ${focus || 'agenda, debate e resposta rapida'}.`;
  }
  return `Universo inicial sugerido a partir do lote documental recebido. Topicos recorrentes: ${focus || 'contexto geral do lote'}.`;
}

function buildSuggestion(items: UniverseInboxItem[]): UniverseInboxSuggestion {
  const keywords = aggregateKeywords(items);
  const topKeywords = keywords.slice(0, 12).map((entry) => entry.keyword);
  const templateId = suggestUniverseTemplate(items);
  const template = getUniverseBootstrapTemplate(templateId) ?? getUniverseBootstrapTemplate('blank_minimal');
  const cluster = clusterBatchByTheme(items);
  const lowTextCount = items.filter((item) => item.analysis.lowText).length;
  const confidence = Math.max(0.2, Math.min(0.96, (topKeywords.length * 0.06) + (cluster.mixedThemes ? 0.08 : 0.24) + ((items.length - lowTextCount) * 0.04)));
  const warnings: string[] = [];
  if (cluster.mixedThemes) warnings.push('O lote parece misturar subtemas. Vale considerar separar em 2 universos antes de ingerir tudo junto.');
  if (lowTextCount > 0) warnings.push(`${lowTextCount} PDF(s) com pouco texto extraido. Revise OCR ou mantenha um bootstrap mais leve.`);
  if (items.length < 2) warnings.push('A sugestao foi gerada com poucos arquivos. O bootstrap ainda depende de revisao humana.');
  if (templateId === 'blank_minimal' && topKeywords.length < 4) warnings.push('Ha poucos sinais tematicos comuns no lote. Use blank_minimal ou separe melhor os PDFs antes do ingest.');

  const glossaryBase = template?.seedGlossary.map((item) => ({ term: item.term, shortDef: item.shortDef, body: item.body, tags: [...item.tags] })) ?? [];
  const extraGlossary = topKeywords.slice(0, Math.max(0, 12 - glossaryBase.length)).map((keyword) => ({
    term: titleCase(keyword),
    shortDef: 'Termo recorrente no lote inicial.',
    body: `Use este termo para organizar provas, docs e debates ligados a ${keyword}.`,
    tags: ['inbox', 'seed'],
  }));

  const questions = [
    ...(template?.seedQuestions.map((item) => item.question) ?? []),
    ...topKeywords.slice(0, 4).map((keyword) => `Como ${keyword} aparece neste lote inicial e que tipo de prova ele promete abrir?`),
  ].slice(0, 8);

  return {
    title: buildSuggestedTitle(templateId, topKeywords),
    slug: slugify(buildSuggestedTitle(templateId, topKeywords)) || `universo-${randomUUID().slice(0, 8)}`,
    summary: buildSuggestedSummary(templateId, topKeywords),
    templateId,
    confidence: Number(confidence.toFixed(2)),
    warnings,
    tags: topKeywords.slice(0, 8),
    subthemes: cluster.clusters.map((entry) => entry.label),
    coreNodes: (template?.seedNodes ?? []).slice(0, 9).map((node) => ({
      slug: node.slug,
      title: node.title,
      summary: node.summary,
      tags: [...node.tags, ...topKeywords.slice(0, 3)],
    })),
    glossary: [...glossaryBase, ...extraGlossary].slice(0, 15),
    questions,
    trail: {
      title: template?.seedTrails[0]?.title ?? 'Comece Aqui',
      summary: template?.seedTrails[0]?.summary ?? 'Percurso inicial sugerido para abrir o universo.',
      steps: (template?.seedTrails[0]?.steps.map((step) => step.title) ?? ['Abrir contexto', 'Localizar atores', 'Separar primeiras provas']).slice(0, 5),
    },
  };
}

function mapItemRow(row: StoredItemRow): UniverseInboxItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    fileName: row.file_name,
    fileSize: Number(row.file_size ?? 0),
    mimeType: row.mime_type,
    storagePath: row.storage_path ?? null,
    extractedTitle: row.extracted_title ?? null,
    previewExcerpt: row.preview_excerpt ?? null,
    status: row.status,
    analysis: row.analysis ?? {
      extractedTitle: row.extracted_title ?? row.file_name,
      previewExcerpt: row.preview_excerpt ?? '',
      textLength: 0,
      pageCount: 0,
      topKeywords: [],
      dominantTemplate: 'blank_minimal',
      templateScores: { blank_minimal: 1, issue_investigation: 0, territorial_memory: 0, campaign_watch: 0 },
      lowText: true,
    },
    createdAt: row.created_at,
  };
}

function mapBatchRow(row: StoredBatchRow, items: UniverseInboxItem[]): UniverseInboxBatch {
  return {
    id: row.id,
    createdBy: row.created_by ?? null,
    status: row.status,
    title: row.title ?? null,
    slug: row.slug ?? null,
    summary: row.summary ?? null,
    suggestedTemplate: row.suggested_template ?? null,
    confidence: Number(row.confidence ?? 0),
    warning: row.warning ?? null,
    createdUniverseId: row.created_universe_id ?? null,
    analysis: row.analysis ?? buildSuggestion(items),
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureDocsBucket() {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data: bucket } = await db.storage.getBucket('cv-docs');
  if (bucket) return db;
  await db.storage.createBucket('cv-docs', {
    public: false,
    fileSizeLimit: '50MB',
    allowedMimeTypes: [PDF_MIME],
  });
  return db;
}

export async function createInboxBatch(input: { files: File[]; userId?: string | null; batchId?: string | null }) {
  const files = input.files.filter((file) => file.size > 0);
  if (files.length === 0) throw new Error('Nenhum PDF recebido');

  if (shouldUseMockInbox()) {
    const batchId = input.batchId?.trim() || `mock-inbox-${randomUUID()}`;
    const existing = mockState.batches.find((batch) => batch.id === batchId) ?? null;
    const items: UniverseInboxItem[] = existing ? [...existing.items] : [];
    for (const file of files) {
      const analyzed = await analyzePdfFile(file);
      items.push({
        id: `mock-inbox-item-${randomUUID()}`,
        batchId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || PDF_MIME,
        storagePath: null,
        extractedTitle: analyzed.analysis.extractedTitle,
        previewExcerpt: analyzed.analysis.previewExcerpt,
        status: 'analyzed',
        analysis: analyzed.analysis,
        createdAt: new Date().toISOString(),
      });
    }

    const suggestion = buildSuggestion(items);
    const batch: UniverseInboxBatch = existing
      ? {
          ...existing,
          status: 'analyzed',
          title: suggestion.title,
          slug: suggestion.slug,
          summary: suggestion.summary,
          suggestedTemplate: suggestion.templateId,
          confidence: suggestion.confidence,
          warning: suggestion.warnings[0] ?? null,
          analysis: suggestion,
          items,
          updatedAt: new Date().toISOString(),
        }
      : {
          id: batchId,
          createdBy: input.userId ?? null,
          status: 'analyzed',
          title: suggestion.title,
          slug: suggestion.slug,
          summary: suggestion.summary,
          suggestedTemplate: suggestion.templateId,
          confidence: suggestion.confidence,
          warning: suggestion.warnings[0] ?? null,
          createdUniverseId: null,
          analysis: suggestion,
          items,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    if (existing) {
      const index = mockState.batches.findIndex((entry) => entry.id === batch.id);
      if (index >= 0) mockState.batches[index] = batch;
    } else {
      mockState.batches.unshift(batch);
    }
    return batch;
  }

  const db = await ensureDocsBucket();
  if (!db) throw new Error('storage_unavailable');

  const batchId = input.batchId?.trim() || null;
  let batchRow: StoredBatchRow | null = null;
  if (batchId) {
    const { data, error } = await db
      .from('universe_inbox_batches')
      .select('id, created_by, status, title, slug, summary, suggested_template, confidence, warning, analysis, created_universe_id, created_at, updated_at')
      .eq('id', batchId)
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'Lote da inbox nao encontrado');
    batchRow = data as StoredBatchRow;
  } else {
    const { data, error } = await db
      .from('universe_inbox_batches')
      .insert({ created_by: input.userId ?? null, status: 'draft' })
      .select('id, created_by, status, title, slug, summary, suggested_template, confidence, warning, analysis, created_universe_id, created_at, updated_at')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar lote da inbox');
    batchRow = data as StoredBatchRow;
  }

  for (const file of files) {
    const analyzed = await analyzePdfFile(file);
    const storagePath = `inbox/${batchRow.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await db.storage.from('cv-docs').upload(storagePath, analyzed.buffer, {
      upsert: true,
      contentType: PDF_MIME,
    });
    if (uploadError) throw new Error(`Falha ao subir ${file.name}`);

    const { error: itemError } = await db.from('universe_inbox_items').insert({
      batch_id: batchRow.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || PDF_MIME,
      storage_path: storagePath,
      extracted_title: analyzed.analysis.extractedTitle,
      preview_excerpt: analyzed.analysis.previewExcerpt,
      status: 'analyzed',
      analysis: analyzed.analysis,
    });
    if (itemError) throw new Error(itemError.message ?? `Falha ao registrar ${file.name}`);
  }

  const { data: storedItems, error: itemsError } = await db
    .from('universe_inbox_items')
    .select('id, batch_id, file_name, file_size, mime_type, storage_path, extracted_title, preview_excerpt, status, analysis, created_at')
    .eq('batch_id', batchRow.id)
    .order('created_at', { ascending: true });
  if (itemsError) throw new Error(itemsError.message ?? 'Falha ao carregar itens da inbox');

  const items = (storedItems ?? []).map((item) => mapItemRow(item as StoredItemRow));
  const suggestion = buildSuggestion(items);
  const { data: updatedBatch } = await db
    .from('universe_inbox_batches')
    .update({
      status: 'analyzed',
      title: suggestion.title,
      slug: suggestion.slug,
      summary: suggestion.summary,
      suggested_template: suggestion.templateId,
      confidence: suggestion.confidence,
      warning: suggestion.warnings[0] ?? null,
      analysis: suggestion,
    })
    .eq('id', batchRow.id)
    .select('id, created_by, status, title, slug, summary, suggested_template, confidence, warning, analysis, created_universe_id, created_at, updated_at')
    .single();

  return mapBatchRow((updatedBatch as StoredBatchRow) ?? ({ ...batchRow, analysis: suggestion } as StoredBatchRow), items);
}
export async function getInboxBatch(batchId: string) {
  if (shouldUseMockInbox()) {
    return mockState.batches.find((batch) => batch.id === batchId) ?? null;
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const [{ data: batch }, { data: items }] = await Promise.all([
    db
      .from('universe_inbox_batches')
      .select('id, created_by, status, title, slug, summary, suggested_template, confidence, warning, analysis, created_universe_id, created_at, updated_at')
      .eq('id', batchId)
      .maybeSingle(),
    db
      .from('universe_inbox_items')
      .select('id, batch_id, file_name, file_size, mime_type, storage_path, extracted_title, preview_excerpt, status, analysis, created_at')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true }),
  ]);

  if (!batch) return null;
  return mapBatchRow(batch as StoredBatchRow, (items ?? []).map((item) => mapItemRow(item as StoredItemRow)));
}

async function ensureMainEditorialProgram(userId?: string | null) {
  const existing = await getEditorialProgram(EDITORIAL_PROGRAM_2026.slug);
  if (existing) return existing;
  return createEditorialProgram({
    title: EDITORIAL_PROGRAM_2026.title,
    slug: EDITORIAL_PROGRAM_2026.slug,
    summary: EDITORIAL_PROGRAM_2026.summary,
    userId: userId ?? null,
  });
}

function normalizeTemplateId(value: string | null | undefined): TemplateId {
  return value === 'issue_investigation' || value === 'territorial_memory' || value === 'campaign_watch' || value === 'blank_minimal'
    ? value
    : 'blank_minimal';
}

export async function createUniverseFromInboxBatch(input: {
  batchId: string;
  userId?: string | null;
  title?: string | null;
  slug?: string | null;
  summary?: string | null;
  templateId?: string | null;
  enqueueIngest?: boolean;
}) {
  const batch = await getInboxBatch(input.batchId);
  if (!batch) throw new Error('Lote da inbox nao encontrado');

  const suggestion = batch.analysis;
  const title = input.title?.trim() || suggestion.title;
  const slug = slugify(input.slug?.trim() || suggestion.slug || title) || `universo-${randomUUID().slice(0, 8)}`;
  const summary = input.summary?.trim() || suggestion.summary;
  const templateId = normalizeTemplateId(input.templateId || suggestion.templateId);
  const enqueue = input.enqueueIngest !== false;

  const universe = await bootstrapUniverseWorkflow({
    mode: 'template',
    universe: { title, slug, summary, publishNow: false },
    templateId,
    userId: input.userId ?? null,
  });

  let docsAttached = 0;
  if (!shouldUseMockInbox()) {
    const db = getSupabaseServiceRoleClient();
    if (!db) throw new Error('Admin DB unavailable');
    for (const item of batch.items) {
      const { data: doc, error } = await db
        .from('documents')
        .insert({
          universe_id: universe.id,
          title: item.extractedTitle || item.analysis.extractedTitle || deriveTitleFromFilename(item.fileName),
          authors: null,
          year: null,
          journal: null,
          doi: null,
          abstract: item.previewExcerpt || item.analysis.previewExcerpt || null,
          pdf_url: null,
          import_source: 'universe_inbox',
          kind: 'upload',
          source_url: null,
          storage_path: item.storagePath,
          status: item.storagePath ? 'uploaded' : 'error',
          is_deleted: false,
        })
        .select('id, status')
        .single();
      if (error || !doc) continue;
      docsAttached += 1;
      if (enqueue && doc.status === 'uploaded') {
        await enqueueIngestJob({ universeId: universe.id, documentId: doc.id });
      }
    }

    await db.from('universe_inbox_batches').update({
      status: 'created',
      created_universe_id: universe.id,
      title,
      slug,
      summary,
      suggested_template: templateId,
      analysis: { ...suggestion, title, slug, summary, templateId },
      updated_at: new Date().toISOString(),
    }).eq('id', batch.id);
  } else {
    const target = mockState.batches.find((entry) => entry.id === batch.id);
    if (target) {
      target.status = 'created';
      target.createdUniverseId = universe.id;
      target.title = title;
      target.slug = slug;
      target.summary = summary;
      target.suggestedTemplate = templateId;
      target.analysis = { ...suggestion, title, slug, summary, templateId };
      target.updatedAt = new Date().toISOString();
    }
    docsAttached = batch.items.length;
  }

  const program = await ensureMainEditorialProgram(input.userId ?? null);
  const lane: EditorialLane = batch.items.length > 0 ? 'ingest' : 'bootstrap';
  await addUniverseToProgram({
    programId: program.id,
    universeId: universe.id,
    lane,
    priority: suggestion.templateId === 'issue_investigation' ? 3 : 2,
    note: `Inbox: ${batch.items.length} PDF(s) | template ${templateId}`,
  });

  return {
    universe,
    program,
    lane,
    docsAttached,
    batchId: batch.id,
  };
}

export async function analyzePdfBatch(files: File[]) {
  const items: UniverseInboxItem[] = [];
  for (const file of files.filter((entry) => entry.size > 0)) {
    const analyzed = await analyzePdfFile(file);
    items.push({
      id: `analysis-item-${randomUUID()}`,
      batchId: 'analysis-only',
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || PDF_MIME,
      storagePath: null,
      extractedTitle: analyzed.analysis.extractedTitle,
      previewExcerpt: analyzed.analysis.previewExcerpt,
      status: 'analyzed',
      analysis: analyzed.analysis,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    items,
    cluster: clusterBatchByTheme(items),
    suggestion: buildSuggestion(items),
  };
}

export function suggestUniverseFromBatch(items: UniverseInboxItem[]) {
  return buildSuggestion(items);
}

export function suggestCoreNodes(items: UniverseInboxItem[]) {
  return buildSuggestion(items).coreNodes;
}

export function suggestGlossary(items: UniverseInboxItem[]) {
  return buildSuggestion(items).glossary;
}

export function suggestStarterQuestions(items: UniverseInboxItem[]) {
  return buildSuggestion(items).questions;
}

export function suggestSummary(items: UniverseInboxItem[]) {
  return buildSuggestion(items).summary;
}

export async function listRecentInboxBatches(limit = 3) {
  const safeLimit = Math.max(1, Math.min(12, Math.floor(limit)));
  if (shouldUseMockInbox()) {
    return mockState.batches
      .slice()
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .slice(0, safeLimit);
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return [];
  const { data } = await db
    .from('universe_inbox_batches')
    .select('id, created_by, status, title, slug, summary, suggested_template, confidence, warning, analysis, created_universe_id, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(safeLimit);

  return (data ?? []).map((row) => mapBatchRow(row as StoredBatchRow, []));
}

