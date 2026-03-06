import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export type ChecklistThresholds = {
  minNodes: number;
  minCoreNodes: number;
  minDocsTotal: number;
  minDocsProcessed: number;
  minEvidencesTotal: number;
  minEvidencesPerCoreNode: number;
  minQuestionsPerCoreNode: number;
  maxLinkOnlyDocs: number;
  maxIngestPending: number;
  maxAskInsufficientRate24h: number;
  minAvgTextQualityScore: number;
  maxBadDocsRatePct: number;
};

const DEFAULT_THRESHOLDS: ChecklistThresholds = {
  minNodes: 12,
  minCoreNodes: 5,
  minDocsTotal: 10,
  minDocsProcessed: 5,
  minEvidencesTotal: 15,
  minEvidencesPerCoreNode: 2,
  minQuestionsPerCoreNode: 2,
  maxLinkOnlyDocs: 5,
  maxIngestPending: 10,
  maxAskInsufficientRate24h: 60,
  minAvgTextQualityScore: 65,
  maxBadDocsRatePct: 20,
};

type CheckItem = {
  id: string;
  label: string;
  status: CheckStatus;
  value: string;
  target: string;
  actionLink: string;
};

type NextAction = {
  id: string;
  priority: number;
  status: CheckStatus;
  text: string;
  link: string;
};

type CoverageRow = {
  nodeId: string;
  title: string;
  kind: string;
  tags: string[];
  core: boolean;
  docsLinkedCount: number;
  evidencesLinkedCount: number;
  draftEvidencesLinkedCount: number;
  questionsCount: number;
  coverageScore: number;
};

type IngestSummary = {
  pending: number;
  running: number;
  done: number;
  error: number;
};

export type UniverseChecklist = {
  overview: {
    universeId: string;
    title: string;
    slug: string;
    publishedAt: string | null;
    totalNodes: number;
    coreNodesCount: number;
    totalDocs: number;
    docsByStatus: Record<'uploaded' | 'processed' | 'link_only' | 'error', number>;
    totalChunks: number;
    totalEvidences: number;
    publishedEvidencesTotal: number;
    draftEvidencesTotal: number;
    totalTrails: number;
    totalTutorModules: number;
    links: {
      nodeDocumentsCount: number;
      nodeEvidencesCount: number;
      nodeQuestionsCount: number;
    };
    quality: {
      avgTextQualityScore: number;
      badDocsCount: number;
      badDocsRatePct: number;
      emptyPagesTotal: number;
    };
    collectiveReview: {
      draft: number;
      review: number;
    };
  };
  operational24h: {
    askTotal24h: number;
    askInsufficient24h: number;
    askInsufficientRate: number;
    askLatencyAvgMs: number;
    exports24h: number;
    ingestJobs: IngestSummary;
  };
  coverage: {
    total: number;
    rows: CoverageRow[];
  };
  checks: CheckItem[];
  nextActions: NextAction[];
  readiness: {
    status: CheckStatus;
    failCount: number;
    warnCount: number;
    topIssues: CheckItem[];
  };
  thresholds: ChecklistThresholds;
};

function toStatus(value: number, passLimit: number, warnLimit: number): CheckStatus {
  if (value >= passLimit) return 'pass';
  if (value >= warnLimit) return 'warn';
  return 'fail';
}

function toStatusMax(value: number, passLimit: number, warnLimit: number): CheckStatus {
  if (value <= passLimit) return 'pass';
  if (value <= warnLimit) return 'warn';
  return 'fail';
}

function isCoreNode(node: { kind: string; tags: string[] }) {
  if (node.kind === 'core') return true;
  if ((node.tags ?? []).some((tag) => tag.toLowerCase() === 'core')) return true;
  if (node.kind === 'concept') return true;
  return false;
}

function scoreNodeCoverage(input: { docs: number; evidences: number; questions: number }) {
  const docsScore = Math.min(1, input.docs / 2) * 30;
  const evidencesScore = Math.min(1, input.evidences / 2) * 40;
  const questionsScore = Math.min(1, input.questions / 2) * 30;
  return Math.round(docsScore + evidencesScore + questionsScore);
}

function statusWeight(status: CheckStatus) {
  if (status === 'fail') return 3;
  if (status === 'warn') return 2;
  return 1;
}

export async function getUniverseChecklist(universeId: string): Promise<UniverseChecklist | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;

  const universeQuery = await db
    .from('universes')
    .select('id, slug, title, published_at')
    .eq('id', universeId)
    .maybeSingle();
  if (!universeQuery.data) return null;
  const universe = universeQuery.data;
  const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    nodesQuery,
    documentsQuery,
    chunksCountQuery,
    evidencesRowsQuery,
    trailsCountQuery,
    tutorModulesCountQuery,
    nodeDocumentsQuery,
    nodeEvidencesQuery,
    nodeQuestionsQuery,
    qaLogsQuery,
    ingestJobsQuery,
    exports24hQuery,
    quickStartTrailQuery,
    sharedDraftQuery,
    sharedReviewQuery,
  ] = await Promise.all([
    db.from('nodes').select('id, title, kind, tags').eq('universe_id', universeId),
    db
      .from('documents')
      .select('id, status, is_deleted, text_quality_score, empty_pages_count')
      .eq('universe_id', universeId)
      .eq('is_deleted', false),
    db.from('chunks').select('id', { count: 'exact', head: true }).eq('universe_id', universeId),
    db.from('evidences').select('id, status').eq('universe_id', universeId),
    db.from('trails').select('id', { count: 'exact', head: true }).eq('universe_id', universeId),
    db.from('tutor_modules').select('id', { count: 'exact', head: true }).eq('universe_id', universeId),
    db.from('node_documents').select('id, node_id').eq('universe_id', universeId),
    db.from('node_evidences').select('id, node_id, evidence_id').eq('universe_id', universeId),
    db.from('node_questions').select('id, node_id').eq('universe_id', universeId),
    db
      .from('qa_logs')
      .select('insufficient_reason, evidence_sufficient, latency_ms, created_at, status_code')
      .eq('universe_id', universeId)
      .eq('kind', 'ask')
      .gte('created_at', since24hIso),
    db.from('ingest_jobs').select('status').eq('universe_id', universeId),
    db.from('exports').select('id', { count: 'exact', head: true }).eq('universe_id', universeId).gte('created_at', since24hIso),
    db.from('trails').select('id').eq('universe_id', universeId).eq('slug', 'comece-aqui').maybeSingle(),
    db.from('shared_notebook_items').select('*', { count: 'exact', head: true }).eq('universe_id', universeId).eq('review_status', 'draft'),
    db.from('shared_notebook_items').select('*', { count: 'exact', head: true }).eq('universe_id', universeId).eq('review_status', 'review'),
  ]);

  const thresholds = DEFAULT_THRESHOLDS;
  const nodesRaw = nodesQuery.data ?? [];
  const totalNodes = nodesRaw.length;
  const coreNodeIds = nodesRaw.filter((node) => isCoreNode({ kind: node.kind, tags: node.tags ?? [] })).map((n) => n.id);
  const coreNodeSet = new Set(coreNodeIds);
  const coreNodesCount = coreNodeIds.length;

  const documents = documentsQuery.data ?? [];
  const docsByStatus = {
    uploaded: documents.filter((doc) => doc.status === 'uploaded').length,
    processed: documents.filter((doc) => doc.status === 'processed').length,
    link_only: documents.filter((doc) => doc.status === 'link_only').length,
    error: documents.filter((doc) => doc.status === 'error').length,
  };
  const totalDocs = documents.length;
  const qualityScores = documents
    .map((doc) => doc.text_quality_score)
    .filter((value): value is number => typeof value === 'number');
  const avgTextQualityScore =
    qualityScores.length > 0
      ? Math.round(qualityScores.reduce((sum, value) => sum + value, 0) / qualityScores.length)
      : 0;
  const badDocsCount = documents.filter(
    (doc) => typeof doc.text_quality_score === 'number' && doc.text_quality_score < 60,
  ).length;
  const badDocsRatePct = totalDocs > 0 ? Math.round((badDocsCount / totalDocs) * 100) : 0;
  const emptyPagesTotal = documents.reduce((sum, doc) => sum + (doc.empty_pages_count ?? 0), 0);

  const nodeDocuments = nodeDocumentsQuery.data ?? [];
  const nodeEvidences = nodeEvidencesQuery.data ?? [];
  const nodeQuestions = nodeQuestionsQuery.data ?? [];
  const docsByNode = new Map<string, number>();
  const evidencesByNode = new Map<string, number>();
  const draftEvidencesByNode = new Map<string, number>();
  const questionsByNode = new Map<string, number>();

  const evidenceStatusById = new Map(
    (evidencesRowsQuery.data ?? []).map((row) => [
      row.id,
      row.status === 'draft' || row.status === 'review' || row.status === 'rejected' ? row.status : 'published',
    ]),
  );

  const allEvidencesTotal = Number(evidencesRowsQuery.data?.length ?? 0);
  const publishedEvidencesTotal = (evidencesRowsQuery.data ?? []).filter((row) => row.status === 'published').length;
  const draftEvidencesTotal = (evidencesRowsQuery.data ?? []).filter((row) => row.status !== 'published').length;

  for (const row of nodeDocuments) {
    docsByNode.set(row.node_id, (docsByNode.get(row.node_id) ?? 0) + 1);
  }
  for (const row of nodeEvidences) {
    const status = evidenceStatusById.get(row.evidence_id) ?? 'published';
    if (status === 'published') {
      evidencesByNode.set(row.node_id, (evidencesByNode.get(row.node_id) ?? 0) + 1);
    } else {
      draftEvidencesByNode.set(row.node_id, (draftEvidencesByNode.get(row.node_id) ?? 0) + 1);
    }
  }
  for (const row of nodeQuestions) {
    questionsByNode.set(row.node_id, (questionsByNode.get(row.node_id) ?? 0) + 1);
  }

  const coverageRows: CoverageRow[] = nodesRaw
    .map((node) => {
      const docs = docsByNode.get(node.id) ?? 0;
      const evidences = evidencesByNode.get(node.id) ?? 0;
      const draftEvidences = draftEvidencesByNode.get(node.id) ?? 0;
      const questions = questionsByNode.get(node.id) ?? 0;
      const core = coreNodeSet.has(node.id);
      return {
        nodeId: node.id,
        title: node.title,
        kind: node.kind,
        tags: node.tags ?? [],
        core,
        docsLinkedCount: docs,
        evidencesLinkedCount: evidences,
        draftEvidencesLinkedCount: draftEvidences,
        questionsCount: questions,
        coverageScore: scoreNodeCoverage({ docs, evidences, questions }),
      };
    })
    .sort((a, b) => {
      if (a.coverageScore !== b.coverageScore) return a.coverageScore - b.coverageScore;
      if (a.core !== b.core) return a.core ? -1 : 1;
      return a.title.localeCompare(b.title);
    });

  const coreCoverage = coverageRows.filter((row) => row.core);
  const coreMissingEvidence = coreCoverage.filter((row) => row.evidencesLinkedCount === 0).length;
  const coreWarnEvidence = coreCoverage.filter((row) => row.evidencesLinkedCount === 1).length;
  const coreMissingQuestion = coreCoverage.filter((row) => row.questionsCount === 0).length;
  const coreWarnQuestion = coreCoverage.filter((row) => row.questionsCount === 1).length;

  const askRows = qaLogsQuery.data ?? [];
  const askTotal24h = askRows.length;
  const askInsufficient24h = askRows.filter(
    (row) => row.insufficient_reason !== null || row.evidence_sufficient === false,
  ).length;
  const askInsufficientRate = askTotal24h > 0 ? Math.round((askInsufficient24h / askTotal24h) * 100) : 0;
  const askLatencyValues = askRows.map((row) => row.latency_ms).filter((value): value is number => typeof value === 'number');
  const askLatencyAvgMs =
    askLatencyValues.length > 0
      ? Math.round(askLatencyValues.reduce((sum, value) => sum + value, 0) / askLatencyValues.length)
      : 0;

  const ingestJobsRaw = ingestJobsQuery.data ?? [];
  const ingestSummary: IngestSummary = {
    pending: ingestJobsRaw.filter((job) => job.status === 'pending').length,
    running: ingestJobsRaw.filter((job) => job.status === 'running').length,
    done: ingestJobsRaw.filter((job) => job.status === 'done').length,
    error: ingestJobsRaw.filter((job) => job.status === 'error').length,
  };

  const checks: CheckItem[] = [];
  const pushCheck = (item: CheckItem) => checks.push(item);

  const quickStartTrailId = quickStartTrailQuery.data?.id ?? null;
  const quickStartStepsQuery = quickStartTrailId
    ? await db
        .from('trail_steps')
        .select('required_evidence_ids, guided_question, requires_question')
        .eq('trail_id', quickStartTrailId)
    : { data: [] as Array<{ required_evidence_ids: string[] | null; guided_question: string | null; requires_question: boolean }> };
  const quickStartSteps = quickStartStepsQuery.data ?? [];
  const hasQuickStartEvidenceTask = quickStartSteps.some(
    (step) => Array.isArray(step.required_evidence_ids) && step.required_evidence_ids.length > 0,
  );
  const hasQuickStartGuidedQuestionTask = quickStartSteps.some(
    (step) => Boolean(step.guided_question && step.guided_question.trim()) && Boolean(step.requires_question),
  );
  const quickStartTutoriaStatus: CheckStatus =
    quickStartTrailId && hasQuickStartEvidenceTask && hasQuickStartGuidedQuestionTask
      ? 'pass'
      : quickStartTrailId && (hasQuickStartEvidenceTask || hasQuickStartGuidedQuestionTask)
        ? 'warn'
        : 'fail';
  pushCheck({
    id: 'quickstart_tutoria',
    label: 'Comece-aqui com tutoria',
    status: quickStartTutoriaStatus,
    value: `trilha:${quickStartTrailId ? 'ok' : 'nao'} | evidencia:${hasQuickStartEvidenceTask ? 'ok' : 'nao'} | pergunta:${
      hasQuickStartGuidedQuestionTask ? 'ok' : 'nao'
    }`,
    target: '>=1 passo com evidencia obrigatoria e >=1 com pergunta guiada',
    actionLink: `/admin/universes/${universeId}/trilhas`,
  });
  const tutorReadyStatus: CheckStatus =
    quickStartTutoriaStatus === 'pass' ? 'pass' : quickStartTutoriaStatus === 'warn' ? 'warn' : 'fail';
  pushCheck({
    id: 'tutor_ready',
    label: 'Tutor pronto',
    status: tutorReadyStatus,
    value:
      tutorReadyStatus === 'pass'
        ? 'sessao por ponto habilitada e requisitos minimos atendidos'
        : 'faltam tarefas guiadas no comece-aqui para o tutor v1',
    target: 'pelo menos 1 ponto com evidencia obrigatoria e 1 pergunta guiada',
    actionLink:
      tutorReadyStatus === 'pass' ? `/c/${universe.slug}/tutor` : `/admin/universes/${universeId}/trilhas`,
  });

  const nodesStatus = toStatus(totalNodes, thresholds.minNodes, 8);
  pushCheck({
    id: 'nodes_total',
    label: 'Total de nos',
    status: nodesStatus,
    value: String(totalNodes),
    target: `>= ${thresholds.minNodes}`,
    actionLink: `/admin/universes/${universeId}/nodes`,
  });

  const coreNodesStatus = toStatus(coreNodesCount, thresholds.minCoreNodes, 3);
  pushCheck({
    id: 'core_nodes',
    label: 'Nos core',
    status: coreNodesStatus,
    value: String(coreNodesCount),
    target: `>= ${thresholds.minCoreNodes}`,
    actionLink: `/admin/universes/${universeId}/nodes`,
  });

  const docsTotalStatus = toStatus(totalDocs, thresholds.minDocsTotal, 5);
  pushCheck({
    id: 'docs_total',
    label: 'Documentos totais',
    status: docsTotalStatus,
    value: String(totalDocs),
    target: `>= ${thresholds.minDocsTotal}`,
    actionLink: `/admin/universes/${universeId}/docs`,
  });

  const docsProcessedStatus = toStatus(docsByStatus.processed, thresholds.minDocsProcessed, 2);
  pushCheck({
    id: 'docs_processed',
    label: 'Documentos processados',
    status: docsProcessedStatus,
    value: String(docsByStatus.processed),
    target: `>= ${thresholds.minDocsProcessed}`,
    actionLink: `/admin/universes/${universeId}/docs`,
  });

  const docsLinkOnlyStatus = toStatusMax(docsByStatus.link_only, thresholds.maxLinkOnlyDocs, 10);
  pushCheck({
    id: 'docs_link_only',
    label: 'Documentos link-only',
    status: docsLinkOnlyStatus,
    value: String(docsByStatus.link_only),
    target: `<= ${thresholds.maxLinkOnlyDocs}`,
    actionLink: `/admin/universes/${universeId}/docs`,
  });

  const docsQualityAvgStatus = toStatus(avgTextQualityScore, thresholds.minAvgTextQualityScore, 50);
  pushCheck({
    id: 'docs_quality_avg',
    label: 'Qualidade media dos documentos',
    status: docsQualityAvgStatus,
    value: String(avgTextQualityScore),
    target: `>= ${thresholds.minAvgTextQualityScore}`,
    actionLink: `/admin/universes/${universeId}/docs/qualidade`,
  });

  const badDocsRateStatus = toStatusMax(badDocsRatePct, thresholds.maxBadDocsRatePct, 40);
  pushCheck({
    id: 'docs_bad_rate',
    label: 'Percentual de docs ruins',
    status: badDocsRateStatus,
    value: `${badDocsRatePct}% (${badDocsCount}/${totalDocs})`,
    target: `<= ${thresholds.maxBadDocsRatePct}%`,
    actionLink: `/admin/universes/${universeId}/docs/qualidade`,
  });

  const evidencesStatus = toStatus(
    publishedEvidencesTotal,
    thresholds.minEvidencesTotal,
    8,
  );
  pushCheck({
    id: 'evidences_total',
    label: 'Evidencias publicadas',
    status: evidencesStatus,
    value: `${publishedEvidencesTotal} (draft/review/rejected: ${draftEvidencesTotal})`,
    target: `>= ${thresholds.minEvidencesTotal}`,
    actionLink: `/admin/universes/${universeId}/review`,
  });

  const coreEvidencesStatus: CheckStatus =
    coreMissingEvidence > 0 ? 'fail' : coreWarnEvidence > 0 ? 'warn' : 'pass';
  pushCheck({
    id: 'core_evidence_coverage',
    label: 'Cobertura de evidencias publicadas por no core',
    status: coreEvidencesStatus,
    value: `0:${coreMissingEvidence} | 1:${coreWarnEvidence} | drafts:${coreCoverage.reduce(
      (sum, row) => sum + row.draftEvidencesLinkedCount,
      0,
    )}`,
    target: `cada core >= ${thresholds.minEvidencesPerCoreNode}`,
    actionLink: `/admin/universes/${universeId}/review`,
  });

  const coreQuestionsStatus: CheckStatus =
    coreMissingQuestion > 0 ? 'fail' : coreWarnQuestion > 0 ? 'warn' : 'pass';
  pushCheck({
    id: 'core_questions_coverage',
    label: 'Perguntas por no core',
    status: coreQuestionsStatus,
    value: `0:${coreMissingQuestion} | 1:${coreWarnQuestion}`,
    target: `cada core >= ${thresholds.minQuestionsPerCoreNode}`,
    actionLink: `/admin/universes/${universeId}/assistido`,
  });

  const ingestPendingStatus = toStatusMax(ingestSummary.pending, thresholds.maxIngestPending, 30);
  pushCheck({
    id: 'ingest_pending',
    label: 'Ingest pendente',
    status: ingestPendingStatus,
    value: String(ingestSummary.pending),
    target: `<= ${thresholds.maxIngestPending}`,
    actionLink: `/admin/universes/${universeId}/docs`,
  });

  const askInsufficientStatus = toStatusMax(
    askInsufficientRate,
    thresholds.maxAskInsufficientRate24h,
    80,
  );
  pushCheck({
    id: 'ask_insufficient_rate',
    label: 'Ask insufficient rate (24h)',
    status: askInsufficientStatus,
    value: `${askInsufficientRate}%`,
    target: `<= ${thresholds.maxAskInsufficientRate24h}%`,
    actionLink: '/admin/status',
  });

  const failCount = checks.filter((check) => check.status === 'fail').length;
  const publishedWithFailStatus: CheckStatus = universe.published_at && failCount > 0 ? 'warn' : 'pass';
  pushCheck({
    id: 'published_safety',
    label: 'Seguranca de publicacao',
    status: publishedWithFailStatus,
    value: universe.published_at ? (failCount > 0 ? 'publicado com lacunas' : 'publicado') : 'preview',
    target: 'sem FAIL antes de publicar',
    actionLink: `/admin/universes/${universeId}`,
  });

  const finalFailCount = checks.filter((check) => check.status === 'fail').length;
  const finalWarnCount = checks.filter((check) => check.status === 'warn').length;
  const readinessStatus: CheckStatus = finalFailCount > 0 ? 'fail' : finalWarnCount > 0 ? 'warn' : 'pass';

  const nextActions: NextAction[] = checks
    .filter((check) => check.status !== 'pass')
    .map((check) => ({
      id: check.id,
      priority: statusWeight(check.status),
      status: check.status,
      text: `${check.label}: ${check.value} (meta ${check.target})`,
      link: check.actionLink,
    }))
    .sort((a, b) => b.priority - a.priority);

  return {
    overview: {
      universeId,
      title: universe.title,
      slug: universe.slug,
      publishedAt: universe.published_at,
      totalNodes,
      coreNodesCount,
      totalDocs,
      docsByStatus,
      totalChunks: Number(chunksCountQuery.count ?? 0),
      totalEvidences: allEvidencesTotal,
      publishedEvidencesTotal,
      draftEvidencesTotal,
      totalTrails: Number(trailsCountQuery.count ?? 0),
      totalTutorModules: Number(tutorModulesCountQuery.count ?? 0),
      links: {
        nodeDocumentsCount: nodeDocuments.length,
        nodeEvidencesCount: nodeEvidences.length,
        nodeQuestionsCount: nodeQuestions.length,
      },
      quality: {
        avgTextQualityScore,
        badDocsCount,
        badDocsRatePct,
        emptyPagesTotal,
      },
      collectiveReview: {
        draft: Number(sharedDraftQuery.count ?? 0),
        review: Number(sharedReviewQuery.count ?? 0),
      },
    },
    operational24h: {
      askTotal24h,
      askInsufficient24h,
      askInsufficientRate,
      askLatencyAvgMs,
      exports24h: Number(exports24hQuery.count ?? 0),
      ingestJobs: ingestSummary,
    },
    coverage: {
      total: coverageRows.length,
      rows: coverageRows,
    },
    checks,
    nextActions,
    readiness: {
      status: readinessStatus,
      failCount: finalFailCount,
      warnCount: finalWarnCount,
      topIssues: checks
        .filter((check) => check.status !== 'pass')
        .sort((a, b) => statusWeight(b.status) - statusWeight(a.status))
        .slice(0, 3),
    },
    thresholds,
  };
}
