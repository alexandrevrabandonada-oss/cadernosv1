import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type TutorPointDraft = {
  orderIndex: number;
  nodeId: string | null;
  nodeSlug: string | null;
  title: string;
  goal: string;
  requiredEvidenceIds: string[];
  guidedQuestions: string[];
};

type NodeCandidate = {
  id: string;
  slug: string;
  title: string;
  core: boolean;
  evidenceCount: number;
  questionCount: number;
  docCount: number;
  score: number;
};

function isCore(kind: string, tags: unknown) {
  const tagList = Array.isArray(tags) ? tags.map((tag) => String(tag).toLowerCase()) : [];
  return kind === 'core' || kind === 'concept' || tagList.includes('core');
}

function fallbackQuestions(nodeTitle: string) {
  return [
    `O que os estudos mostram sobre ${nodeTitle}?`,
    `Quais evidencias sustentam ou contradizem ${nodeTitle}?`,
  ];
}

function pickDiverseNodes(candidates: NodeCandidate[], adjacency: Map<string, Set<string>>, target: number) {
  const selected: NodeCandidate[] = [];
  for (const candidate of candidates) {
    if (selected.length >= target) break;
    const connectedToAll = selected.every((chosen) => adjacency.get(chosen.id)?.has(candidate.id));
    if (connectedToAll && selected.length > 0) continue;
    selected.push(candidate);
  }
  if (selected.length < target) {
    for (const candidate of candidates) {
      if (selected.length >= target) break;
      if (selected.some((item) => item.id === candidate.id)) continue;
      selected.push(candidate);
    }
  }
  return selected;
}

export async function planTutorPoints(universeId: string): Promise<TutorPointDraft[]> {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [];

  const [nodesQuery, nodeEvidenceQuery, nodeQuestionsQuery, nodeDocumentsQuery, edgesQuery] = await Promise.all([
    db.from('nodes').select('id, slug, title, kind, tags').eq('universe_id', universeId),
    db
      .from('node_evidences')
      .select('node_id, evidence_id, pin_rank')
      .eq('universe_id', universeId)
      .order('pin_rank', { ascending: true }),
    db
      .from('node_questions')
      .select('node_id, question, pin_rank')
      .eq('universe_id', universeId)
      .order('pin_rank', { ascending: true }),
    db
      .from('node_documents')
      .select('node_id, document_id, weight')
      .eq('universe_id', universeId)
      .order('weight', { ascending: false }),
    db.from('edges').select('from_node_id, to_node_id').eq('universe_id', universeId),
  ]);

  const nodes = nodesQuery.data ?? [];
  if (nodes.length === 0) return [];

  const evidenceIds = Array.from(new Set((nodeEvidenceQuery.data ?? []).map((row) => row.evidence_id)));
  const { data: evidenceStatusRaw } =
    evidenceIds.length > 0
      ? await db.from('evidences').select('id, status').in('id', evidenceIds)
      : { data: [] as Array<{ id: string; status: string }> };
  const evidenceStatusById = new Map((evidenceStatusRaw ?? []).map((row) => [row.id, row.status]));

  const evidenceByNode = new Map<string, string[]>();
  for (const row of nodeEvidenceQuery.data ?? []) {
    if (evidenceStatusById.get(row.evidence_id) !== 'published') continue;
    const current = evidenceByNode.get(row.node_id) ?? [];
    if (!current.includes(row.evidence_id)) current.push(row.evidence_id);
    evidenceByNode.set(row.node_id, current);
  }

  const questionsByNode = new Map<string, string[]>();
  for (const row of nodeQuestionsQuery.data ?? []) {
    const current = questionsByNode.get(row.node_id) ?? [];
    if (!current.includes(row.question)) current.push(row.question);
    questionsByNode.set(row.node_id, current);
  }

  const docsByNode = new Map<string, number>();
  for (const row of nodeDocumentsQuery.data ?? []) {
    docsByNode.set(row.node_id, (docsByNode.get(row.node_id) ?? 0) + 1);
  }

  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) adjacency.set(node.id, new Set<string>());
  for (const edge of edgesQuery.data ?? []) {
    adjacency.get(edge.from_node_id)?.add(edge.to_node_id);
    adjacency.get(edge.to_node_id)?.add(edge.from_node_id);
  }

  const candidates: NodeCandidate[] = nodes
    .map((node) => {
      const evidenceCount = (evidenceByNode.get(node.id) ?? []).length;
      const questionCount = (questionsByNode.get(node.id) ?? []).length;
      const docCount = docsByNode.get(node.id) ?? 0;
      const core = isCore(node.kind, node.tags);
      const score = (core ? 200 : 0) + evidenceCount * 90 + questionCount * 60 + docCount * 35;
      return {
        id: node.id,
        slug: node.slug,
        title: node.title,
        core,
        evidenceCount,
        questionCount,
        docCount,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const prioritized = candidates.sort((a, b) => {
    if (a.core !== b.core) return a.core ? -1 : 1;
    return b.score - a.score;
  });
  const selected = pickDiverseNodes(prioritized, adjacency, Math.min(4, Math.max(2, prioritized.length)));

  const drafts: TutorPointDraft[] = selected.map((node, index) => {
    const requiredEvidenceIds = (evidenceByNode.get(node.id) ?? []).slice(0, 3);
    const guidedQuestions = (questionsByNode.get(node.id) ?? []).slice(0, 2);
    return {
      orderIndex: index,
      nodeId: node.id,
      nodeSlug: node.slug,
      title: node.title,
      goal: `Compreender ${node.title} por evidencias e perguntas guiadas, conectando o no ao restante do universo.`,
      requiredEvidenceIds,
      guidedQuestions: guidedQuestions.length > 0 ? guidedQuestions : fallbackQuestions(node.title),
    };
  });

  const coreNodes = prioritized.filter((node) => node.core);
  const gaps = coreNodes.filter((node) => node.evidenceCount === 0 || node.questionCount === 0);
  const gapText =
    gaps.length > 0
      ? `Lacunas prioritarias em ${gaps.slice(0, 3).map((item) => item.title).join(', ')}.`
      : 'Revisar limitacoes e registrar proximos passos de investigacao.';

  drafts.push({
    orderIndex: drafts.length,
    nodeId: null,
    nodeSlug: null,
    title: 'Lacunas e proximos passos',
    goal: gapText,
    requiredEvidenceIds: [],
    guidedQuestions: [
      'Quais lacunas permanecem sem evidencia suficiente?',
      'Que documento ou pergunta deve entrar no proximo ciclo de curadoria?',
    ],
  });

  return drafts.slice(0, 5);
}
