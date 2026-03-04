import 'server-only';
import { generateSuggestionsForNode } from '@/lib/curation/suggest';
import { promoteChunkToEvidence } from '@/lib/curation/promoteEvidence';
import { regenerateQuickStartTrail } from '@/lib/onboarding/quickstart';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

type SprintMode = 'core' | 'all';

export type SprintOptions = {
  mode?: SprintMode;
  targetDocsPerNode?: number;
  targetEvidencesPerNode?: number;
  targetQuestionsPerNode?: number;
  maxNodes?: number;
  dryRun?: boolean;
  actorUserId?: string;
};

type SprintNodeSummary = {
  nodeId: string;
  slug: string;
  title: string;
  core: boolean;
  before: {
    docs: number;
    evidences: number;
    questions: number;
  };
  after: {
    docs: number;
    evidences: number;
    questions: number;
  };
  applied: {
    docsAdded: number;
    evidencesAdded: number;
    questionsAdded: number;
  };
  suggestions: {
    docs: number;
    evidences: number;
    questions: number;
  };
  warnings: string[];
};

export type SprintRunResult = {
  universeId: string;
  universeSlug: string;
  mode: SprintMode;
  dryRun: boolean;
  nodesProcessed: number;
  actions: {
    linksAdded: number;
    evidencesPromoted: number;
    questionsAdded: number;
  };
  beforeTotals: {
    docs: number;
    evidences: number;
    questions: number;
  };
  afterTotals: {
    docs: number;
    evidences: number;
    questions: number;
  };
  perNode: SprintNodeSummary[];
  warnings: string[];
  durationMs: number;
};

export type SprintDashboardNode = {
  nodeId: string;
  slug: string;
  title: string;
  core: boolean;
  docs: number;
  evidences: number;
  questions: number;
  docSuggestions: number;
  evidenceSuggestions: number;
  questionSuggestions: number;
  avgDocQuality: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  coverageScore: number;
};

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isCoreNode(kind: string, tags: string[] | null) {
  const tagList = (tags ?? []).map((tag) => String(tag).toLowerCase());
  return kind === 'core' || kind === 'concept' || tagList.includes('core');
}

async function getNodeCounts(universeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return new Map<string, { docs: number; evidences: number; questions: number }>();

  const [docRows, evidenceRows, questionRows] = await Promise.all([
    db.from('node_documents').select('node_id').eq('universe_id', universeId),
    db.from('node_evidences').select('node_id').eq('universe_id', universeId),
    db.from('node_questions').select('node_id').eq('universe_id', universeId),
  ]);

  const counts = new Map<string, { docs: number; evidences: number; questions: number }>();
  for (const row of docRows.data ?? []) {
    const current = counts.get(row.node_id) ?? { docs: 0, evidences: 0, questions: 0 };
    current.docs += 1;
    counts.set(row.node_id, current);
  }
  for (const row of evidenceRows.data ?? []) {
    const current = counts.get(row.node_id) ?? { docs: 0, evidences: 0, questions: 0 };
    current.evidences += 1;
    counts.set(row.node_id, current);
  }
  for (const row of questionRows.data ?? []) {
    const current = counts.get(row.node_id) ?? { docs: 0, evidences: 0, questions: 0 };
    current.questions += 1;
    counts.set(row.node_id, current);
  }
  return counts;
}

async function getSuggestionCounts(universeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return new Map<string, { docs: number; evidences: number; questions: number }>();
  const [docRows, evidenceRows, questionRows] = await Promise.all([
    db.from('node_document_suggestions').select('node_id').eq('universe_id', universeId),
    db.from('node_evidence_suggestions').select('node_id').eq('universe_id', universeId),
    db.from('node_question_suggestions').select('node_id').eq('universe_id', universeId),
  ]);
  const counts = new Map<string, { docs: number; evidences: number; questions: number }>();
  for (const row of docRows.data ?? []) {
    const current = counts.get(row.node_id) ?? { docs: 0, evidences: 0, questions: 0 };
    current.docs += 1;
    counts.set(row.node_id, current);
  }
  for (const row of evidenceRows.data ?? []) {
    const current = counts.get(row.node_id) ?? { docs: 0, evidences: 0, questions: 0 };
    current.evidences += 1;
    counts.set(row.node_id, current);
  }
  for (const row of questionRows.data ?? []) {
    const current = counts.get(row.node_id) ?? { docs: 0, evidences: 0, questions: 0 };
    current.questions += 1;
    counts.set(row.node_id, current);
  }
  return counts;
}

async function getAvgDocQualityByNode(universeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return new Map<string, number>();
  const { data: links } = await db
    .from('node_documents')
    .select('node_id, document_id')
    .eq('universe_id', universeId);
  const docIds = Array.from(new Set((links ?? []).map((item) => item.document_id)));
  if (docIds.length === 0) return new Map<string, number>();
  const { data: docs } = await db.from('documents').select('id, text_quality_score').in('id', docIds);
  const scoreByDoc = new Map((docs ?? []).map((doc) => [doc.id, doc.text_quality_score]));
  const avg = new Map<string, number>();
  const counter = new Map<string, { sum: number; count: number }>();
  for (const row of links ?? []) {
    const score = scoreByDoc.get(row.document_id);
    if (typeof score !== 'number') continue;
    const current = counter.get(row.node_id) ?? { sum: 0, count: 0 };
    current.sum += score;
    current.count += 1;
    counter.set(row.node_id, current);
  }
  for (const [nodeId, value] of counter.entries()) {
    avg.set(nodeId, Math.round(value.sum / Math.max(1, value.count)));
  }
  return avg;
}

function coverageScore(input: { docs: number; evidences: number; questions: number }) {
  const docsScore = Math.min(100, (input.docs / 3) * 30);
  const evidencesScore = Math.min(100, (input.evidences / 3) * 40);
  const questionsScore = Math.min(100, (input.questions / 3) * 30);
  return Math.round(docsScore + evidencesScore + questionsScore);
}

function rowStatus(input: { docs: number; evidences: number; questions: number }) {
  if (input.docs >= 3 && input.evidences >= 3 && input.questions >= 3) return 'PASS';
  if (input.docs >= 2 && input.evidences >= 2 && input.questions >= 2) return 'WARN';
  return 'FAIL';
}

export async function listSprintDashboardNodes(universeId: string, mode: SprintMode = 'core') {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as SprintDashboardNode[];

  const [{ data: nodesRaw }, nodeCounts, suggestionCounts, avgQuality] = await Promise.all([
    db
      .from('nodes')
      .select('id, slug, title, kind, tags')
      .eq('universe_id', universeId)
      .order('created_at', { ascending: true }),
    getNodeCounts(universeId),
    getSuggestionCounts(universeId),
    getAvgDocQualityByNode(universeId),
  ]);

  const rows = (nodesRaw ?? [])
    .map((node) => {
      const core = isCoreNode(node.kind, node.tags ?? []);
      const counts = nodeCounts.get(node.id) ?? { docs: 0, evidences: 0, questions: 0 };
      const suggestions = suggestionCounts.get(node.id) ?? { docs: 0, evidences: 0, questions: 0 };
      return {
        nodeId: node.id,
        slug: node.slug,
        title: node.title,
        core,
        docs: counts.docs,
        evidences: counts.evidences,
        questions: counts.questions,
        docSuggestions: suggestions.docs,
        evidenceSuggestions: suggestions.evidences,
        questionSuggestions: suggestions.questions,
        avgDocQuality: avgQuality.get(node.id) ?? 0,
        status: rowStatus(counts),
        coverageScore: coverageScore(counts),
      } satisfies SprintDashboardNode;
    })
    .filter((row) => (mode === 'core' ? row.core : true))
    .sort((a, b) => {
      if (a.coverageScore !== b.coverageScore) return a.coverageScore - b.coverageScore;
      if (a.core !== b.core) return a.core ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  return rows;
}

export async function listRecentSprintRuns(universeId: string, limit = 10) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as Array<{ id: string; created_at: string; mode: SprintMode; result: Record<string, unknown> }>;
  const { data } = await db
    .from('curadoria_sprint_runs')
    .select('id, created_at, mode, result')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: false })
    .limit(clampInt(limit, 1, 50));
  return (data ?? []) as Array<{ id: string; created_at: string; mode: SprintMode; result: Record<string, unknown> }>;
}

async function readNodeState(universeId: string, nodeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    return {
      docs: [] as Array<{ document_id: string; weight: number }>,
      evidences: [] as Array<{ evidence_id: string; pin_rank: number }>,
      questions: [] as Array<{ question: string; pin_rank: number }>,
      linkedChunkIds: new Set<string>(),
    };
  }

  const [docsRows, evidenceRows, questionRows] = await Promise.all([
    db
      .from('node_documents')
      .select('document_id, weight')
      .eq('universe_id', universeId)
      .eq('node_id', nodeId),
    db
      .from('node_evidences')
      .select('evidence_id, pin_rank')
      .eq('universe_id', universeId)
      .eq('node_id', nodeId)
      .order('pin_rank', { ascending: true }),
    db
      .from('node_questions')
      .select('question, pin_rank')
      .eq('universe_id', universeId)
      .eq('node_id', nodeId)
      .order('pin_rank', { ascending: true }),
  ]);

  const evidenceIds = Array.from(new Set((evidenceRows.data ?? []).map((row) => row.evidence_id)));
  const linkedChunkIds = new Set<string>();
  if (evidenceIds.length > 0) {
    const { data: evidenceData } = await db.from('evidences').select('chunk_id').in('id', evidenceIds);
    for (const row of evidenceData ?? []) {
      if (row.chunk_id) linkedChunkIds.add(row.chunk_id);
    }
  }

  return {
    docs: (docsRows.data ?? []) as Array<{ document_id: string; weight: number }>,
    evidences: (evidenceRows.data ?? []) as Array<{ evidence_id: string; pin_rank: number }>,
    questions: (questionRows.data ?? []) as Array<{ question: string; pin_rank: number }>,
    linkedChunkIds,
  };
}

async function applyNodeDocuments(input: {
  universeId: string;
  nodeId: string;
  target: number;
  actorUserId?: string;
  dryRun: boolean;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return { added: 0, countAfter: 0, warnings: ['Supabase indisponivel para docs.'] };

  const current = await readNodeState(input.universeId, input.nodeId);
  let currentCount = current.docs.length;
  if (currentCount >= input.target) {
    return { added: 0, countAfter: currentCount, warnings: [] as string[] };
  }

  const { data: suggestionsRaw } = await db
    .from('node_document_suggestions')
    .select('id, document_id, score')
    .eq('node_id', input.nodeId)
    .order('score', { ascending: false })
    .limit(40);

  const suggestionDocIds = Array.from(new Set((suggestionsRaw ?? []).map((row) => row.document_id)));
  if (suggestionDocIds.length === 0) {
    return { added: 0, countAfter: currentCount, warnings: ['Sem sugestoes de documentos para o no.'] };
  }
  const { data: docsRaw } = await db
    .from('documents')
    .select('id, status, text_quality_score')
    .in('id', suggestionDocIds)
    .eq('is_deleted', false);
  const docById = new Map((docsRaw ?? []).map((doc) => [doc.id, doc]));
  const linkedIds = new Set(current.docs.map((row) => row.document_id));
  let added = 0;
  const warnings: string[] = [];

  const ranked = (suggestionsRaw ?? [])
    .map((item) => {
      const doc = docById.get(item.document_id);
      if (!doc) return null;
      if (doc.status === 'link_only' || doc.status === 'error') return null;
      const quality = typeof doc.text_quality_score === 'number' ? doc.text_quality_score : null;
      const qualityGate = quality === null ? true : quality >= 60;
      return {
        documentId: item.document_id,
        score: item.score,
        status: doc.status,
        quality,
        qualityGate,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      const aProcessed = a.status === 'processed' ? 1 : 0;
      const bProcessed = b.status === 'processed' ? 1 : 0;
      if (aProcessed !== bProcessed) return bProcessed - aProcessed;
      const aQuality = typeof a.quality === 'number' ? a.quality : -1;
      const bQuality = typeof b.quality === 'number' ? b.quality : -1;
      if (aQuality !== bQuality) return bQuality - aQuality;
      return b.score - a.score;
    });

  for (const item of ranked) {
    if (currentCount >= input.target) break;
    if (linkedIds.has(item.documentId)) continue;
    if (!item.qualityGate) continue;

    if (!input.dryRun) {
      await db.from('node_documents').upsert(
        {
          universe_id: input.universeId,
          node_id: input.nodeId,
          document_id: item.documentId,
          weight: clampInt(item.score, 50, 1000),
          note: 'sprint:auto',
          created_by: input.actorUserId ?? null,
        },
        { onConflict: 'node_id,document_id' },
      );
    }

    linkedIds.add(item.documentId);
    currentCount += 1;
    added += 1;
  }

  if (currentCount < input.target) {
    warnings.push(`Meta de docs nao atingida (${currentCount}/${input.target}).`);
  }
  return { added, countAfter: currentCount, warnings };
}

async function applyNodeEvidences(input: {
  universeId: string;
  nodeId: string;
  target: number;
  actorUserId?: string;
  dryRun: boolean;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return { added: 0, countAfter: 0, warnings: ['Supabase indisponivel para evidencias.'] };

  const current = await readNodeState(input.universeId, input.nodeId);
  let currentCount = current.evidences.length;
  let pinRankBase = current.evidences.reduce((max, item) => Math.max(max, item.pin_rank), 90) + 10;
  if (currentCount >= input.target) {
    return { added: 0, countAfter: currentCount, warnings: [] as string[] };
  }

  const { data: suggestionsRaw } = await db
    .from('node_evidence_suggestions')
    .select('chunk_id, score')
    .eq('node_id', input.nodeId)
    .order('score', { ascending: false })
    .limit(40);
  const warnings: string[] = [];
  let added = 0;

  for (const suggestion of suggestionsRaw ?? []) {
    if (currentCount >= input.target) break;
    if (current.linkedChunkIds.has(suggestion.chunk_id)) continue;

    if (input.dryRun) {
      currentCount += 1;
      added += 1;
      continue;
    }

    const promoted = await promoteChunkToEvidence({
      universeId: input.universeId,
      chunkId: suggestion.chunk_id,
      nodeId: input.nodeId,
      pinRank: clampInt(pinRankBase, 50, 1000),
    });
    pinRankBase += 10;
    if (!promoted?.evidenceId) continue;
    current.linkedChunkIds.add(suggestion.chunk_id);
    currentCount += 1;
    added += 1;
  }

  if (currentCount < input.target) {
    warnings.push(`Meta de evidencias nao atingida (${currentCount}/${input.target}).`);
  }
  return { added, countAfter: currentCount, warnings };
}

async function applyNodeQuestions(input: {
  universeId: string;
  nodeId: string;
  target: number;
  actorUserId?: string;
  dryRun: boolean;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return { added: 0, countAfter: 0, warnings: ['Supabase indisponivel para perguntas.'] };

  const current = await readNodeState(input.universeId, input.nodeId);
  let currentCount = current.questions.length;
  let pinRankBase = current.questions.reduce((max, item) => Math.max(max, item.pin_rank), 90) + 10;
  if (currentCount >= input.target) {
    return { added: 0, countAfter: currentCount, warnings: [] as string[] };
  }

  const existingNormalized = new Set(current.questions.map((item) => item.question.trim().toLowerCase()));
  const { data: suggestionsRaw } = await db
    .from('node_question_suggestions')
    .select('question, score')
    .eq('node_id', input.nodeId)
    .order('score', { ascending: false })
    .limit(40);
  const warnings: string[] = [];
  let added = 0;

  for (const suggestion of suggestionsRaw ?? []) {
    if (currentCount >= input.target) break;
    const normalized = suggestion.question.trim().toLowerCase();
    if (!normalized || existingNormalized.has(normalized)) continue;

    if (!input.dryRun) {
      await db.from('node_questions').upsert(
        {
          universe_id: input.universeId,
          node_id: input.nodeId,
          question: suggestion.question.trim(),
          pin_rank: clampInt(pinRankBase, 50, 1000),
          created_by: input.actorUserId ?? null,
        },
        { onConflict: 'node_id,question' },
      );
    }

    existingNormalized.add(normalized);
    currentCount += 1;
    pinRankBase += 10;
    added += 1;
  }

  if (currentCount < input.target) {
    warnings.push(`Meta de perguntas nao atingida (${currentCount}/${input.target}).`);
  }
  return { added, countAfter: currentCount, warnings };
}

export async function runCurationSprint(universeId: string, options: SprintOptions = {}): Promise<SprintRunResult | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;

  const startedAt = Date.now();
  const mode: SprintMode = options.mode === 'all' ? 'all' : 'core';
  const dryRun = Boolean(options.dryRun);
  const targetDocsPerNode = clampInt(options.targetDocsPerNode ?? 3, 1, 10);
  const targetEvidencesPerNode = clampInt(options.targetEvidencesPerNode ?? 3, 1, 10);
  const targetQuestionsPerNode = clampInt(options.targetQuestionsPerNode ?? 3, 1, 10);
  const maxNodes = clampInt(options.maxNodes ?? 8, 1, 20);

  const [{ data: universe }, dashboardRows] = await Promise.all([
    db.from('universes').select('id, slug').eq('id', universeId).maybeSingle(),
    listSprintDashboardNodes(universeId, mode),
  ]);
  if (!universe) return null;

  const candidates = dashboardRows
    .filter((row) => row.docs < targetDocsPerNode || row.evidences < targetEvidencesPerNode || row.questions < targetQuestionsPerNode)
    .slice(0, maxNodes);

  const perNode: SprintNodeSummary[] = [];
  let linksAdded = 0;
  let evidencesPromoted = 0;
  let questionsAdded = 0;
  const warnings: string[] = [];

  for (const row of candidates) {
    const nodeWarnings: string[] = [];
    const before = { docs: row.docs, evidences: row.evidences, questions: row.questions };
    let suggestions = {
      docs: row.docSuggestions,
      evidences: row.evidenceSuggestions,
      questions: row.questionSuggestions,
    };

    const needsSuggestions =
      suggestions.docs < targetDocsPerNode || suggestions.evidences < targetEvidencesPerNode || suggestions.questions < targetQuestionsPerNode;
    if (needsSuggestions && !dryRun) {
      // eslint-disable-next-line no-await-in-loop
      const generated = await generateSuggestionsForNode(universeId, row.nodeId);
      suggestions = {
        docs: Math.max(suggestions.docs, generated.docs),
        evidences: Math.max(suggestions.evidences, generated.evidences),
        questions: Math.max(suggestions.questions, generated.questions),
      };
    }

    // eslint-disable-next-line no-await-in-loop
    const docs = await applyNodeDocuments({
      universeId,
      nodeId: row.nodeId,
      target: targetDocsPerNode,
      actorUserId: options.actorUserId,
      dryRun,
    });
    // eslint-disable-next-line no-await-in-loop
    const evidences = await applyNodeEvidences({
      universeId,
      nodeId: row.nodeId,
      target: targetEvidencesPerNode,
      actorUserId: options.actorUserId,
      dryRun,
    });
    // eslint-disable-next-line no-await-in-loop
    const questions = await applyNodeQuestions({
      universeId,
      nodeId: row.nodeId,
      target: targetQuestionsPerNode,
      actorUserId: options.actorUserId,
      dryRun,
    });

    nodeWarnings.push(...docs.warnings, ...evidences.warnings, ...questions.warnings);
    linksAdded += docs.added;
    evidencesPromoted += evidences.added;
    questionsAdded += questions.added;

    perNode.push({
      nodeId: row.nodeId,
      slug: row.slug,
      title: row.title,
      core: row.core,
      before,
      after: {
        docs: docs.countAfter,
        evidences: evidences.countAfter,
        questions: questions.countAfter,
      },
      applied: {
        docsAdded: docs.added,
        evidencesAdded: evidences.added,
        questionsAdded: questions.added,
      },
      suggestions,
      warnings: nodeWarnings,
    });
    warnings.push(...nodeWarnings.map((warn) => `${row.slug}: ${warn}`));
  }

  const beforeTotals = perNode.reduce(
    (sum, node) => ({
      docs: sum.docs + node.before.docs,
      evidences: sum.evidences + node.before.evidences,
      questions: sum.questions + node.before.questions,
    }),
    { docs: 0, evidences: 0, questions: 0 },
  );
  const afterTotals = perNode.reduce(
    (sum, node) => ({
      docs: sum.docs + node.after.docs,
      evidences: sum.evidences + node.after.evidences,
      questions: sum.questions + node.after.questions,
    }),
    { docs: 0, evidences: 0, questions: 0 },
  );

  if (!dryRun && perNode.length > 0) {
    await regenerateQuickStartTrail(universeId, universe.slug);
  }

  const durationMs = Date.now() - startedAt;
  const result: SprintRunResult = {
    universeId,
    universeSlug: universe.slug,
    mode,
    dryRun,
    nodesProcessed: perNode.length,
    actions: {
      linksAdded,
      evidencesPromoted,
      questionsAdded,
    },
    beforeTotals,
    afterTotals,
    perNode,
    warnings: Array.from(new Set(warnings)),
    durationMs,
  };

  if (!dryRun) {
    await db.from('curadoria_sprint_runs').insert({
      universe_id: universeId,
      created_by: options.actorUserId ?? null,
      mode,
      result: result as unknown as Record<string, unknown>,
    });

    await db.from('ingest_logs').insert({
      universe_id: universeId,
      level: 'info',
      message: 'curation_sprint_completed',
      details: {
        mode,
        nodesProcessed: result.nodesProcessed,
        linksAdded,
        evidencesPromoted,
        questionsAdded,
        durationMs,
      },
    });
  }

  return result;
}

