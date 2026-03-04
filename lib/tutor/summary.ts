import 'server-only';
import { getUniverseChecklist } from '@/lib/ops/universeChecklist';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type TutorCoveredPoint = {
  title: string;
  nodeId: string | null;
  doneAt: string | null;
};

export type TutorFinding = {
  text: string;
  evidenceIds: string[];
  qaThreadIds: string[];
};

export type TutorLimitation = {
  text: string;
};

export type TutorNextSteps = {
  nodes: Array<{ id: string; slug: string; title: string }>;
  trails: Array<{ id: string; slug: string | null; title: string }>;
  evidences: Array<{ id: string; title: string; summary: string }>;
};

export type TutorSessionSummaryData = {
  sessionId: string;
  universeId: string;
  userId: string | null;
  coveredPoints: TutorCoveredPoint[];
  keyFindings: TutorFinding[];
  limitations: TutorLimitation[];
  nextSteps: TutorNextSteps;
};

function cleanLine(text: string) {
  return text.replace(/\s+/g, ' ').replace(/^[\-*•]\s*/, '').trim();
}

function extractAchados(answer: string) {
  const normalized = answer.replace(/\r/g, '');
  const match = normalized.match(/##\s*Achados([\s\S]*?)(##\s*Limita[cç][oõ]es|##\s*Cita[cç][oõ]es|$)/i);
  if (!match) return [] as string[];
  const block = match[1] ?? '';
  const lines = block
    .split('\n')
    .map((line) => cleanLine(line))
    .filter((line) => line.length > 0 && !/^achados$/i.test(line));
  const bulletLike = lines.filter((line) => /^[A-Za-zÀ-ÿ0-9]/.test(line));
  return Array.from(new Set(bulletLike)).slice(0, 6);
}

export async function buildTutorSessionSummary(sessionId: string): Promise<TutorSessionSummaryData | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;

  const { data: session } = await db
    .from('tutor_sessions')
    .select('id, universe_id, user_id, status')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return null;

  const [{ data: pointsRaw }] = await Promise.all([
    db
      .from('tutor_points')
      .select('id, node_id, title, status, completed_at, last_thread_id, required_evidence_ids, order_index')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true }),
  ]);

  const points = pointsRaw ?? [];
  const donePoints = points.filter((point) => point.status === 'done');
  const coveredPoints: TutorCoveredPoint[] = donePoints.map((point) => ({
    title: point.title,
    nodeId: point.node_id ?? null,
    doneAt: point.completed_at ?? null,
  }));

  const pointByThreadId = new Map(
    donePoints
      .filter((point) => point.last_thread_id)
      .map((point) => [point.last_thread_id as string, point]),
  );

  const { data: chatQaRows } = await db
    .from('tutor_chat_messages')
    .select('qa_thread_id, tutor_chat_threads!inner(session_id)')
    .eq('tutor_chat_threads.session_id', sessionId)
    .not('qa_thread_id', 'is', null);

  const qaThreadIds = Array.from(
    new Set([
      ...donePoints.map((point) => point.last_thread_id).filter((id): id is string => Boolean(id)),
      ...(chatQaRows ?? []).map((row) => row.qa_thread_id).filter((id): id is string => Boolean(id)),
    ]),
  );

  const [{ data: qaThreads }, { data: citations }] = await Promise.all([
    qaThreadIds.length > 0
      ? db.from('qa_threads').select('id, answer, mode, insufficient_reason').in('id', qaThreadIds)
      : Promise.resolve({ data: [] as Array<{ id: string; answer: string; mode: string; insufficient_reason: string | null }> }),
    qaThreadIds.length > 0
      ? db.from('citations').select('qa_thread_id, chunk_id').in('qa_thread_id', qaThreadIds)
      : Promise.resolve({ data: [] as Array<{ qa_thread_id: string; chunk_id: string }> }),
  ]);

  const chunkIds = Array.from(new Set((citations ?? []).map((item) => item.chunk_id)));
  const { data: evidencesByChunkRaw } =
    chunkIds.length > 0
      ? await db.from('evidences').select('id, chunk_id').in('chunk_id', chunkIds)
      : { data: [] as Array<{ id: string; chunk_id: string }> };
  const evidenceByChunk = new Map((evidencesByChunkRaw ?? []).map((row) => [row.chunk_id, row.id]));
  const citationEvidenceByThread = new Map<string, string[]>();
  for (const citation of citations ?? []) {
    const evidenceId = evidenceByChunk.get(citation.chunk_id);
    if (!evidenceId) continue;
    const current = citationEvidenceByThread.get(citation.qa_thread_id) ?? [];
    if (!current.includes(evidenceId)) current.push(evidenceId);
    citationEvidenceByThread.set(citation.qa_thread_id, current);
  }

  const findings: TutorFinding[] = [];
  for (const thread of qaThreads ?? []) {
    if (!thread.answer) continue;
    const lines = extractAchados(thread.answer);
    const point = pointByThreadId.get(thread.id);
    const requiredEvidenceIds = Array.isArray(point?.required_evidence_ids)
      ? (point?.required_evidence_ids as string[])
      : [];
    const evidenceIds = (citationEvidenceByThread.get(thread.id) ?? []).slice(0, 3);
    const fallbackEvidence = requiredEvidenceIds.slice(0, 3);
    for (const line of lines) {
      findings.push({
        text: line,
        evidenceIds: evidenceIds.length > 0 ? evidenceIds : fallbackEvidence,
        qaThreadIds: [thread.id],
      });
      if (findings.length >= 5) break;
    }
    if (findings.length >= 5) break;
  }

  if (findings.length === 0) {
    for (const point of donePoints.slice(0, 5)) {
      findings.push({
        text: `O ponto "${point.title}" foi explorado com foco em evidencias do universo.`,
        evidenceIds: Array.isArray(point.required_evidence_ids) ? (point.required_evidence_ids as string[]).slice(0, 2) : [],
        qaThreadIds: point.last_thread_id ? [point.last_thread_id] : [],
      });
    }
  }

  const limitations: TutorLimitation[] = [];
  const insufficientThreads = (qaThreads ?? []).filter(
    (thread) => thread.mode === 'insufficient' || Boolean(thread.insufficient_reason),
  );
  for (const thread of insufficientThreads.slice(0, 2)) {
    limitations.push({
      text: thread.insufficient_reason
        ? `Pergunta com base insuficiente: ${thread.insufficient_reason}.`
        : 'Pergunta com evidencias insuficientes para conclusao estrita.',
    });
  }

  if (session.universe_id) {
    const checklist = await getUniverseChecklist(session.universe_id);
    if (checklist) {
      const lowCoverageCore = checklist.coverage.rows.filter((row) => row.core).slice(0, 3);
      for (const row of lowCoverageCore) {
        if (row.evidencesLinkedCount === 0 || row.questionsCount === 0) {
          limitations.push({
            text: `No core "${row.title}" ainda possui baixa cobertura (evidencias:${row.evidencesLinkedCount}, perguntas:${row.questionsCount}).`,
          });
        }
      }
    }
  }

  const doneNodeIds = new Set(donePoints.map((point) => point.node_id).filter((id): id is string => Boolean(id)));
  const checklist = await getUniverseChecklist(session.universe_id);
  const recommendedNodeIds =
    checklist?.coverage.rows
      .filter((row) => row.core && !doneNodeIds.has(row.nodeId))
      .sort((a, b) => a.coverageScore - b.coverageScore)
      .slice(0, 2)
      .map((row) => row.nodeId) ?? [];

  const { data: recommendedNodesRaw } =
    recommendedNodeIds.length > 0
      ? await db.from('nodes').select('id, slug, title').in('id', recommendedNodeIds)
      : { data: [] as Array<{ id: string; slug: string; title: string }> };
  const recommendedNodes = (recommendedNodesRaw ?? []).map((node) => ({
    id: node.id,
    slug: node.slug,
    title: node.title,
  }));

  const { data: trailsRaw } = await db
    .from('trails')
    .select('id, slug, title')
    .eq('universe_id', session.universe_id)
    .order('created_at', { ascending: false })
    .limit(12);
  const preferredTrail =
    (trailsRaw ?? []).find((trail) => trail.slug && trail.slug !== 'comece-aqui') ??
    (trailsRaw ?? []).find((trail) => trail.slug === 'comece-aqui') ??
    (trailsRaw ?? [])[0];
  const recommendedTrails = preferredTrail
    ? [{ id: preferredTrail.id, slug: preferredTrail.slug ?? null, title: preferredTrail.title }]
    : [];

  const { data: nodeEvidenceLinksRaw } =
    recommendedNodeIds.length > 0
      ? await db
          .from('node_evidences')
          .select('evidence_id, pin_rank')
          .eq('universe_id', session.universe_id)
          .in('node_id', recommendedNodeIds)
          .order('pin_rank', { ascending: true })
          .limit(12)
      : { data: [] as Array<{ evidence_id: string; pin_rank: number }> };
  const evidenceIds = Array.from(new Set((nodeEvidenceLinksRaw ?? []).map((row) => row.evidence_id))).slice(0, 6);
  const { data: evidencesRaw } =
    evidenceIds.length > 0
      ? await db.from('evidences').select('id, title, summary').in('id', evidenceIds)
      : { data: [] as Array<{ id: string; title: string; summary: string }> };
  const recommendedEvidences = (evidencesRaw ?? []).slice(0, 3).map((evidence) => ({
    id: evidence.id,
    title: evidence.title,
    summary: evidence.summary,
  }));

  return {
    sessionId: session.id,
    universeId: session.universe_id,
    userId: session.user_id ?? null,
    coveredPoints,
    keyFindings: findings.slice(0, 5),
    limitations: limitations.slice(0, 4),
    nextSteps: {
      nodes: recommendedNodes,
      trails: recommendedTrails,
      evidences: recommendedEvidences,
    },
  };
}

export async function upsertTutorSessionSummary(summary: TutorSessionSummaryData) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data } = await db
    .from('tutor_session_summaries')
    .upsert(
      {
        session_id: summary.sessionId,
        universe_id: summary.universeId,
        user_id: summary.userId,
        covered_points: summary.coveredPoints,
        key_findings: summary.keyFindings,
        limitations: summary.limitations,
        next_steps: summary.nextSteps,
      },
      { onConflict: 'session_id' },
    )
    .select(
      'id, session_id, universe_id, user_id, covered_points, key_findings, limitations, next_steps, created_at, updated_at',
    )
    .maybeSingle();
  return data ?? null;
}
