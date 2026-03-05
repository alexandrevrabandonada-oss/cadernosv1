import 'server-only';
import { randomUUID } from 'crypto';
import { getCurrentSession } from '@/lib/auth/server';
import { captureException } from '@/lib/obs/sentry';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { renderThreadMarkdown, renderTrailMarkdown, renderTutorSessionMarkdown } from '@/lib/export/md';
import { renderConcretoZenPdf } from '@/lib/export/pdf';
import { buildTutorSessionSummary, upsertTutorSessionSummary } from '@/lib/tutor/summary';

type ExportFormat = 'md' | 'pdf';
type ExportKind = 'thread' | 'trail' | 'tutor_session';

type StoredExport = {
  id: string;
  universe_id: string;
  kind: ExportKind;
  thread_id: string | null;
  trail_id: string | null;
  session_id: string | null;
  title: string;
  format: ExportFormat;
  storage_path: string;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
};

type ExportAsset = {
  id: string;
  format: ExportFormat;
  path: string;
  signedUrl: string | null;
};

export type CreatedExport = {
  title: string;
  kind: ExportKind;
  assets: ExportAsset[];
};

type ExportListItem = StoredExport & {
  universe_title: string;
  universe_slug: string;
};

type ExportView = {
  item: ExportListItem;
  canAccess: boolean;
  signedUrl: string | null;
};

function getAdminService() {
  return getSupabaseServiceRoleClient();
}

async function ensureExportsBucket() {
  const db = getAdminService();
  if (!db) return null;

  const { data: bucket } = await db.storage.getBucket('cv-exports');
  if (bucket) return db;

  await db.storage.createBucket('cv-exports', {
    public: false,
    fileSizeLimit: '20MB',
    allowedMimeTypes: ['application/pdf', 'text/markdown'],
  });
  return db;
}

function clampQuote(text: string, max = 320) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function pageLabel(start: number | null, end: number | null) {
  if (!start && !end) return 's/p';
  if (start && end && start !== end) return `p.${start}-${end}`;
  return `p.${start ?? end}`;
}

function buildPath(input: {
  universeId: string;
  kind: ExportKind;
  sourceId: string;
  extension: 'md' | 'pdf';
}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `universes/${input.universeId}/${input.kind}/${input.sourceId}/${stamp}-${randomUUID()}.${input.extension}`;
}

async function createSignedUrl(path: string) {
  const db = getAdminService();
  if (!db) return null;
  const { data } = await db.storage.from('cv-exports').createSignedUrl(path, 60 * 60 * 8);
  return data?.signedUrl ?? null;
}

async function uploadExportFile(input: { path: string; contentType: string; body: string | Buffer }) {
  const db = await ensureExportsBucket();
  if (!db) throw new Error('storage_unavailable');
  const payload = typeof input.body === 'string' ? Buffer.from(input.body, 'utf-8') : input.body;
  const { error } = await db.storage.from('cv-exports').upload(input.path, payload, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) throw new Error('storage_upload_failed');
}

async function insertExportRow(input: {
  universeId: string;
  kind: ExportKind;
  threadId: string | null;
  trailId: string | null;
  sessionId?: string | null;
  title: string;
  format: ExportFormat;
  storagePath: string;
  isPublic: boolean;
  createdBy: string | null;
}) {
  const db = getAdminService();
  if (!db) throw new Error('db_not_configured');
  const { data, error } = await db
    .from('exports')
    .insert({
      universe_id: input.universeId,
      kind: input.kind,
      thread_id: input.threadId,
      trail_id: input.trailId,
      session_id: input.sessionId ?? null,
      title: input.title,
      format: input.format,
      storage_path: input.storagePath,
      is_public: input.isPublic,
      created_by: input.createdBy,
    })
    .select('*')
    .maybeSingle();
  if (error || !data) throw new Error('insert_export_failed');
  return data as StoredExport;
}

async function logExportMetric(input: {
  exportId?: string | null;
  universeId: string;
  format: 'md' | 'pdf' | 'both';
  ok: boolean;
  latencyMs: number;
  statusCode: number;
  details?: Record<string, unknown>;
}) {
  const db = getAdminService();
  if (!db) return;
  await db.from('export_logs').insert({
    export_id: input.exportId ?? null,
    universe_id: input.universeId,
    kind: 'export',
    format: input.format,
    ok: input.ok,
    latency_ms: input.latencyMs,
    status_code: input.statusCode,
    details: input.details ?? {},
  });
}

async function getThreadExportPayload(universeId: string, threadId: string) {
  const db = getAdminService();
  if (!db) throw new Error('db_not_configured');

  const { data: universe } = await db.from('universes').select('id, title').eq('id', universeId).maybeSingle();
  if (!universe) throw new Error('universe_not_found');

  const { data: thread } = await db
    .from('qa_threads')
    .select('id, question, answer, created_at, confidence_score, confidence_label, divergence_flag, divergence_summary, limitations')
    .eq('id', threadId)
    .eq('universe_id', universeId)
    .maybeSingle();
  if (!thread) throw new Error('thread_not_found');

  const { data: citations } = await db
    .from('citations')
    .select('id, chunk_id, quote, page_start, page_end')
    .eq('qa_thread_id', threadId)
    .limit(12);

  const chunkIds = Array.from(new Set((citations ?? []).map((item) => item.chunk_id)));
  const { data: chunks } =
    chunkIds.length > 0
      ? await db.from('chunks').select('id, document_id').in('id', chunkIds)
      : { data: [] as Array<{ id: string; document_id: string }> };
  const docIds = Array.from(new Set((chunks ?? []).map((item) => item.document_id)));
  const { data: docs } =
    docIds.length > 0
      ? await db.from('documents').select('id, title, year').in('id', docIds)
      : { data: [] as Array<{ id: string; title: string; year: number | null }> };
  const chunkToDoc = new Map((chunks ?? []).map((item) => [item.id, item.document_id]));
  const docById = new Map((docs ?? []).map((item) => [item.id, item]));

  const citationRows = (citations ?? []).slice(0, 10).map((item, index) => {
    const doc = docById.get(chunkToDoc.get(item.chunk_id) ?? '');
    return {
      index: index + 1,
      docTitle: doc?.title ?? 'Documento sem titulo',
      year: doc?.year ?? null,
      pageStart: item.page_start,
      pageEnd: item.page_end,
      quote: clampQuote(item.quote),
    };
  });

  return {
    universe,
    thread,
    citations: citationRows,
  };
}

async function getTrailExportPayload(universeId: string, trailId: string) {
  const db = getAdminService();
  if (!db) throw new Error('db_not_configured');

  const { data: universe } = await db.from('universes').select('id, title').eq('id', universeId).maybeSingle();
  if (!universe) throw new Error('universe_not_found');

  const { data: trail } = await db
    .from('trails')
    .select('id, title, summary')
    .eq('id', trailId)
    .eq('universe_id', universeId)
    .maybeSingle();
  if (!trail) throw new Error('trail_not_found');

  const { data: steps } = await db
    .from('trail_steps')
    .select('id, step_order, title, instruction, node_id, evidence_id')
    .eq('trail_id', trailId)
    .order('step_order', { ascending: true })
    .limit(32);

  const nodeIds = Array.from(new Set((steps ?? []).map((item) => item.node_id).filter(Boolean)));
  const evidenceIds = Array.from(new Set((steps ?? []).map((item) => item.evidence_id).filter(Boolean)));
  const [{ data: nodes }, { data: evidences }] = await Promise.all([
    nodeIds.length > 0
      ? db.from('nodes').select('id, title').in('id', nodeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    evidenceIds.length > 0
      ? db.from('evidences').select('id, title, summary').in('id', evidenceIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; summary: string }> }),
  ]);

  const nodeById = new Map((nodes ?? []).map((item) => [item.id, item.title]));
  const evidenceById = new Map((evidences ?? []).map((item) => [item.id, item]));
  const stepRows = (steps ?? []).map((item) => {
    const evidence = item.evidence_id ? evidenceById.get(item.evidence_id) : null;
    return {
      order: item.step_order,
      title: item.title,
      instruction: item.instruction ?? 'Sem instrucao detalhada.',
      nodeTitle: item.node_id ? nodeById.get(item.node_id) ?? null : null,
      evidenceTitle: evidence?.title ?? null,
      evidenceSummary: evidence?.summary ? clampQuote(evidence.summary, 260) : null,
    };
  });

  return {
    universe,
    trail,
    steps: stepRows,
  };
}

export async function createThreadDossier(input: {
  universeId: string;
  threadId: string;
  isPublic?: boolean;
}) {
  const startedAt = Date.now();
  const session = await getCurrentSession();
  if (!session || !(session.role === 'admin' || session.role === 'editor')) {
    throw new Error('forbidden');
  }
  try {
    const payload = await getThreadExportPayload(input.universeId, input.threadId);
    const generatedAt = new Date().toISOString();
    const title = `Dossie - ${payload.thread.question.slice(0, 96)}`;

    const markdown = renderThreadMarkdown({
      universeTitle: payload.universe.title,
      question: payload.thread.question,
      answer: payload.thread.answer,
      createdAt: generatedAt,
      confidence: {
        score: payload.thread.confidence_score ?? null,
        label:
          payload.thread.confidence_label === 'forte' ||
          payload.thread.confidence_label === 'media' ||
          payload.thread.confidence_label === 'fraca'
            ? payload.thread.confidence_label
            : null,
      },
      limitations: Array.isArray(payload.thread.limitations)
        ? (payload.thread.limitations as string[]).filter((item) => typeof item === 'string').slice(0, 4)
        : [],
      divergence: {
        flag: Boolean(payload.thread.divergence_flag),
        summary: payload.thread.divergence_summary ?? null,
      },
      citations: payload.citations,
    });

    const quoteBoxes = payload.citations.map(
      (c) => `[${c.index}] ${c.docTitle}${c.year ? ` (${c.year})` : ''}, ${pageLabel(c.pageStart, c.pageEnd)}: "${c.quote}"`,
    );
    const threadLimitations = Array.isArray(payload.thread.limitations)
      ? (payload.thread.limitations as string[]).filter((item) => typeof item === 'string').slice(0, 4)
      : [];
    const confidenceLabel =
      payload.thread.confidence_label === 'forte' ||
      payload.thread.confidence_label === 'media' ||
      payload.thread.confidence_label === 'fraca'
        ? payload.thread.confidence_label
        : null;

    const pdfBuffer = await renderConcretoZenPdf({
      title: 'Dossie de Debate',
      subtitle: payload.thread.question,
      universeTitle: payload.universe.title,
      generatedAt,
      summary: 'Sintese de pergunta, resposta e evidencias curtas para publicacao.',
      sections: [
        { title: 'Pergunta', body: [payload.thread.question] },
        { title: 'Resposta', body: [payload.thread.answer] },
        {
          title: 'Forca do achado',
          body: [
            confidenceLabel
              ? `Sinal ${confidenceLabel}${typeof payload.thread.confidence_score === 'number' ? ` (${payload.thread.confidence_score}/100)` : ''}.`
              : 'Sinal n/d.',
            ...(threadLimitations.length > 0 ? threadLimitations.map((item) => `Limitacao: ${item}`) : ['Sem limitacoes adicionais registradas.']),
            ...(payload.thread.divergence_flag
              ? [
                  `Possivel divergencia entre fontes: ${
                    payload.thread.divergence_summary ?? 'ha sinais de resultados divergentes ou inconclusivos.'
                  }`,
                ]
              : []),
          ],
        },
        {
          title: 'Evidencias',
          body: ['Trechos curtos citados para suportar a resposta.'],
          quoteBoxes,
        },
      ],
    });

    const mdPath = buildPath({
      universeId: input.universeId,
      kind: 'thread',
      sourceId: input.threadId,
      extension: 'md',
    });
    const pdfPath = buildPath({
      universeId: input.universeId,
      kind: 'thread',
      sourceId: input.threadId,
      extension: 'pdf',
    });

    await uploadExportFile({ path: mdPath, contentType: 'text/markdown; charset=utf-8', body: markdown });
    await uploadExportFile({ path: pdfPath, contentType: 'application/pdf', body: pdfBuffer });

    const [mdRow, pdfRow] = await Promise.all([
      insertExportRow({
        universeId: input.universeId,
        kind: 'thread',
        threadId: input.threadId,
        trailId: null,
        title,
        format: 'md',
        storagePath: mdPath,
        isPublic: Boolean(input.isPublic),
        createdBy: session.userId,
      }),
      insertExportRow({
        universeId: input.universeId,
        kind: 'thread',
        threadId: input.threadId,
        trailId: null,
        title,
        format: 'pdf',
        storagePath: pdfPath,
        isPublic: Boolean(input.isPublic),
        createdBy: session.userId,
      }),
    ]);

    const latency = Date.now() - startedAt;
    await Promise.all([
      logExportMetric({
        exportId: mdRow.id,
        universeId: input.universeId,
        format: 'md',
        ok: true,
        latencyMs: latency,
        statusCode: 200,
      }),
      logExportMetric({
        exportId: pdfRow.id,
        universeId: input.universeId,
        format: 'pdf',
        ok: true,
        latencyMs: latency,
        statusCode: 200,
      }),
    ]);

    return {
      title,
      kind: 'thread' as const,
      assets: [
        { id: mdRow.id, format: 'md' as const, path: mdRow.storage_path, signedUrl: await createSignedUrl(mdRow.storage_path) },
        { id: pdfRow.id, format: 'pdf' as const, path: pdfRow.storage_path, signedUrl: await createSignedUrl(pdfRow.storage_path) },
      ],
    } satisfies CreatedExport;
  } catch (error) {
    const latency = Date.now() - startedAt;
    await logExportMetric({
      universeId: input.universeId,
      format: 'both',
      ok: false,
      latencyMs: latency,
      statusCode: 500,
      details: { kind: 'thread' },
    });
    captureException(error, {
      route: 'export_thread',
      universe_id: input.universeId,
      thread_id: input.threadId,
      latency_ms: latency,
    });
    throw error;
  }
}

export async function createTrailWorkbook(input: {
  universeId: string;
  trailId: string;
  isPublic?: boolean;
}) {
  const startedAt = Date.now();
  const session = await getCurrentSession();
  if (!session || !(session.role === 'admin' || session.role === 'editor')) {
    throw new Error('forbidden');
  }
  try {
    const payload = await getTrailExportPayload(input.universeId, input.trailId);
    const generatedAt = new Date().toISOString();
    const title = `Caderno - ${payload.trail.title.slice(0, 120)}`;

    const markdown = renderTrailMarkdown({
      universeTitle: payload.universe.title,
      trailTitle: payload.trail.title,
      trailSummary: payload.trail.summary,
      createdAt: generatedAt,
      steps: payload.steps,
    });

    const pdfBuffer = await renderConcretoZenPdf({
      title: 'Caderno de Estudo',
      subtitle: payload.trail.title,
      universeTitle: payload.universe.title,
      generatedAt,
      summary: payload.trail.summary || 'Percurso orientado para estudo com passos e evidencias.',
      sections: [
        {
          title: 'Objetivo da trilha',
          body: [payload.trail.summary || 'Sem resumo especificado.'],
        },
        ...payload.steps.map((step) => ({
          title: `Passo ${step.order}: ${step.title}`,
          body: [
            step.instruction,
            `No sugerido: ${step.nodeTitle ?? 'n/d'}`,
            `Evidencia recomendada: ${step.evidenceTitle ?? 'n/d'}`,
          ],
          quoteBoxes: step.evidenceSummary ? [step.evidenceSummary] : undefined,
        })),
      ],
    });

    const mdPath = buildPath({
      universeId: input.universeId,
      kind: 'trail',
      sourceId: input.trailId,
      extension: 'md',
    });
    const pdfPath = buildPath({
      universeId: input.universeId,
      kind: 'trail',
      sourceId: input.trailId,
      extension: 'pdf',
    });

    await uploadExportFile({ path: mdPath, contentType: 'text/markdown; charset=utf-8', body: markdown });
    await uploadExportFile({ path: pdfPath, contentType: 'application/pdf', body: pdfBuffer });

    const [mdRow, pdfRow] = await Promise.all([
      insertExportRow({
        universeId: input.universeId,
        kind: 'trail',
        threadId: null,
        trailId: input.trailId,
        title,
        format: 'md',
        storagePath: mdPath,
        isPublic: Boolean(input.isPublic),
        createdBy: session.userId,
      }),
      insertExportRow({
        universeId: input.universeId,
        kind: 'trail',
        threadId: null,
        trailId: input.trailId,
        title,
        format: 'pdf',
        storagePath: pdfPath,
        isPublic: Boolean(input.isPublic),
        createdBy: session.userId,
      }),
    ]);

    const latency = Date.now() - startedAt;
    await Promise.all([
      logExportMetric({
        exportId: mdRow.id,
        universeId: input.universeId,
        format: 'md',
        ok: true,
        latencyMs: latency,
        statusCode: 200,
      }),
      logExportMetric({
        exportId: pdfRow.id,
        universeId: input.universeId,
        format: 'pdf',
        ok: true,
        latencyMs: latency,
        statusCode: 200,
      }),
    ]);

    return {
      title,
      kind: 'trail' as const,
      assets: [
        { id: mdRow.id, format: 'md' as const, path: mdRow.storage_path, signedUrl: await createSignedUrl(mdRow.storage_path) },
        { id: pdfRow.id, format: 'pdf' as const, path: pdfRow.storage_path, signedUrl: await createSignedUrl(pdfRow.storage_path) },
      ],
    } satisfies CreatedExport;
  } catch (error) {
    const latency = Date.now() - startedAt;
    await logExportMetric({
      universeId: input.universeId,
      format: 'both',
      ok: false,
      latencyMs: latency,
      statusCode: 500,
      details: { kind: 'trail' },
    });
    captureException(error, {
      route: 'export_trail',
      universe_id: input.universeId,
      trail_id: input.trailId,
      latency_ms: latency,
    });
    throw error;
  }
}

export async function createTutorSessionDossier(input: {
  universeId: string;
  sessionId: string;
  isPublic?: boolean;
}) {
  const startedAt = Date.now();
  const session = await getCurrentSession();
  if (!session || !(session.role === 'admin' || session.role === 'editor')) {
    throw new Error('forbidden');
  }
  const db = getAdminService();
  if (!db) throw new Error('db_not_configured');

  try {
    const { data: universe } = await db.from('universes').select('id, title').eq('id', input.universeId).maybeSingle();
    if (!universe) throw new Error('universe_not_found');

    let summaryRow = await db
      .from('tutor_session_summaries')
      .select('id, covered_points, key_findings, limitations, next_steps')
      .eq('session_id', input.sessionId)
      .maybeSingle();

    if (!summaryRow.data) {
      const built = await buildTutorSessionSummary(input.sessionId);
      if (!built) throw new Error('summary_not_found');
      const saved = await upsertTutorSessionSummary(built);
      if (!saved) throw new Error('summary_not_found');
      summaryRow = {
        data: {
          id: saved.id,
          covered_points: saved.covered_points,
          key_findings: saved.key_findings,
          limitations: saved.limitations,
          next_steps: saved.next_steps,
        },
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
    }

    const summary = summaryRow.data;
    if (!summary) throw new Error('summary_not_found');
    const title = `Dossie da Sessao ${input.sessionId.slice(0, 8)}`;
    const generatedAt = new Date().toISOString();

    const coveredPoints = Array.isArray(summary.covered_points)
      ? (summary.covered_points as Array<{ title: string; doneAt: string | null }>)
      : [];
    const keyFindings = Array.isArray(summary.key_findings)
      ? (summary.key_findings as Array<{ text: string; evidenceIds: string[]; qaThreadIds: string[] }>)
      : [];
    const limitations = Array.isArray(summary.limitations)
      ? (summary.limitations as Array<{ text: string }>)
      : [];
    const nextSteps = (summary.next_steps ?? {
      nodes: [],
      trails: [],
      evidences: [],
    }) as {
      nodes: Array<{ title: string; slug: string }>;
      trails: Array<{ title: string; slug: string | null }>;
      evidences: Array<{ title: string; summary: string }>;
    };

    const markdown = renderTutorSessionMarkdown({
      universeTitle: universe.title,
      sessionId: input.sessionId,
      createdAt: generatedAt,
      coveredPoints,
      keyFindings,
      limitations,
      nextSteps,
    });

    const quoteBoxes = keyFindings.map((item, index) => `${index + 1}. ${item.text}`).slice(0, 8);
    const pdfBuffer = await renderConcretoZenPdf({
      title: 'Dossie da Sessao',
      subtitle: `Sessao ${input.sessionId.slice(0, 8)}`,
      universeTitle: universe.title,
      generatedAt,
      summary: 'Consolidacao de pontos cobertos, achados, limitacoes e proximos passos.',
      sections: [
        {
          title: 'O que foi coberto',
          body: coveredPoints.map((item, index) => `${index + 1}. ${item.title}`),
        },
        {
          title: 'Principais achados',
          body: keyFindings.map((item) => item.text),
          quoteBoxes,
        },
        {
          title: 'Limitacoes e lacunas',
          body: limitations.map((item) => item.text),
        },
        {
          title: 'Proximos passos',
          body: [
            `Nos: ${nextSteps.nodes?.map((item) => item.title).join(' | ') || 'n/d'}`,
            `Trilha: ${nextSteps.trails?.map((item) => item.title).join(' | ') || 'n/d'}`,
            `Evidencias: ${nextSteps.evidences?.map((item) => item.title).join(' | ') || 'n/d'}`,
          ],
        },
      ],
    });

    const mdPath = buildPath({
      universeId: input.universeId,
      kind: 'tutor_session',
      sourceId: input.sessionId,
      extension: 'md',
    });
    const pdfPath = buildPath({
      universeId: input.universeId,
      kind: 'tutor_session',
      sourceId: input.sessionId,
      extension: 'pdf',
    });

    await uploadExportFile({ path: mdPath, contentType: 'text/markdown; charset=utf-8', body: markdown });
    await uploadExportFile({ path: pdfPath, contentType: 'application/pdf', body: pdfBuffer });

    const [mdRow, pdfRow] = await Promise.all([
      insertExportRow({
        universeId: input.universeId,
        kind: 'tutor_session',
        threadId: null,
        trailId: null,
        sessionId: input.sessionId,
        title,
        format: 'md',
        storagePath: mdPath,
        isPublic: Boolean(input.isPublic),
        createdBy: session.userId,
      }),
      insertExportRow({
        universeId: input.universeId,
        kind: 'tutor_session',
        threadId: null,
        trailId: null,
        sessionId: input.sessionId,
        title,
        format: 'pdf',
        storagePath: pdfPath,
        isPublic: Boolean(input.isPublic),
        createdBy: session.userId,
      }),
    ]);

    const latency = Date.now() - startedAt;
    await Promise.all([
      logExportMetric({
        exportId: mdRow.id,
        universeId: input.universeId,
        format: 'md',
        ok: true,
        latencyMs: latency,
        statusCode: 200,
        details: { kind: 'tutor_session' },
      }),
      logExportMetric({
        exportId: pdfRow.id,
        universeId: input.universeId,
        format: 'pdf',
        ok: true,
        latencyMs: latency,
        statusCode: 200,
        details: { kind: 'tutor_session' },
      }),
    ]);

    return {
      title,
      kind: 'tutor_session' as const,
      assets: [
        { id: mdRow.id, format: 'md' as const, path: mdRow.storage_path, signedUrl: await createSignedUrl(mdRow.storage_path) },
        { id: pdfRow.id, format: 'pdf' as const, path: pdfRow.storage_path, signedUrl: await createSignedUrl(pdfRow.storage_path) },
      ],
    } satisfies CreatedExport;
  } catch (error) {
    const latency = Date.now() - startedAt;
    await logExportMetric({
      universeId: input.universeId,
      format: 'both',
      ok: false,
      latencyMs: latency,
      statusCode: 500,
      details: { kind: 'tutor_session' },
    });
    captureException(error, {
      route: 'export_tutor_session',
      universe_id: input.universeId,
      session_id: input.sessionId,
      latency_ms: latency,
    });
    throw error;
  }
}

export async function listUniverseExports(universeId: string) {
  const db = getAdminService();
  if (!db) return [] as StoredExport[];
  const { data } = await db
    .from('exports')
    .select('*')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: false })
    .limit(80);
  return (data ?? []) as StoredExport[];
}

export async function setExportPublicFlag(exportId: string, isPublic: boolean) {
  const session = await getCurrentSession();
  if (!session || !(session.role === 'admin' || session.role === 'editor')) throw new Error('forbidden');
  const db = getAdminService();
  if (!db) throw new Error('db_not_configured');
  await db.from('exports').update({ is_public: isPublic }).eq('id', exportId);
}

export async function deleteExportById(exportId: string) {
  const session = await getCurrentSession();
  if (!session || !(session.role === 'admin' || session.role === 'editor')) throw new Error('forbidden');
  const db = getAdminService();
  if (!db) throw new Error('db_not_configured');
  const { data: row } = await db.from('exports').select('id, storage_path').eq('id', exportId).maybeSingle();
  if (!row) return;
  await db.storage.from('cv-exports').remove([row.storage_path]);
  await db.from('exports').delete().eq('id', exportId);
}

export async function getExportViewBySlug(slug: string, exportId: string): Promise<ExportView | null> {
  const db = getAdminService();
  if (!db) return null;

  const { data: row } = await db
    .from('exports')
    .select(
      'id, universe_id, kind, thread_id, trail_id, session_id, title, format, storage_path, is_public, created_by, created_at, universes!inner(title, slug, published, published_at)',
    )
    .eq('id', exportId)
    .eq('universes.slug', slug)
    .maybeSingle();
  if (!row) return null;

  const universe = Array.isArray(row.universes) ? row.universes[0] : row.universes;
  const item: ExportListItem = {
    id: row.id,
    universe_id: row.universe_id,
    kind: row.kind,
    thread_id: row.thread_id,
    trail_id: row.trail_id,
    session_id: row.session_id ?? null,
    title: row.title,
    format: row.format,
    storage_path: row.storage_path,
    is_public: row.is_public,
    created_by: row.created_by,
    created_at: row.created_at,
    universe_title: universe?.title ?? 'Universo',
    universe_slug: universe?.slug ?? slug,
  };

  const session = await getCurrentSession();
  const canPrivileged = Boolean(session && (session.role === 'admin' || session.role === 'editor'));
  const isUniversePublished = Boolean(
    (universe as { published_at?: string | null; published?: boolean } | undefined)?.published_at ||
      (universe as { published?: boolean } | undefined)?.published,
  );
  const canAccess = canPrivileged || (item.is_public && isUniversePublished);
  if (!canAccess) {
    return { item, canAccess: false, signedUrl: null };
  }

  return {
    item,
    canAccess: true,
    signedUrl: await createSignedUrl(item.storage_path),
  };
}

export async function getUniverseIdBySlug(slug: string) {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data } = await db.from('universes').select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
}
