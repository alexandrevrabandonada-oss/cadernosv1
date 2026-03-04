import 'server-only';
import { getQuickQuestions } from '@/lib/onboarding/questions';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

type CoreNode = {
  id: string;
  slug: string;
  title: string;
};

type QuickStep = {
  title: string;
  instruction: string;
  nodeId: string | null;
  evidenceId: string | null;
  requiredEvidenceIds: string[] | null;
  guidedQuestion: string | null;
  guidedNodeId: string | null;
  requiresQuestion: boolean;
};

function isCoreNode(kind: string, tags: unknown) {
  const tagList = Array.isArray(tags) ? tags.map((tag) => String(tag).toLowerCase()) : [];
  return kind === 'core' || kind === 'concept' || tagList.includes('core');
}

async function getCoreNodes(universeId: string): Promise<CoreNode[]> {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [];
  const { data } = await db
    .from('nodes')
    .select('id, slug, title, kind, tags')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: true });
  return (data ?? [])
    .filter((node) => isCoreNode(node.kind, node.tags))
    .slice(0, 6)
    .map((node) => ({ id: node.id, slug: node.slug, title: node.title }));
}

async function getTopEvidenceForCoreNodes(universeId: string, nodeIds: string[]) {
  const db = getSupabaseServiceRoleClient();
  if (!db || nodeIds.length === 0) return [] as Array<{ evidenceId: string; nodeId: string; title: string }>;

  const { data: linksRaw } = await db
    .from('node_evidences')
    .select('evidence_id, node_id, pin_rank')
    .eq('universe_id', universeId)
    .in('node_id', nodeIds)
    .order('pin_rank', { ascending: true })
    .limit(30);

  const links = (linksRaw ?? []).slice(0, 12);
  const evidenceIds = Array.from(new Set(links.map((row) => row.evidence_id)));
  if (evidenceIds.length === 0) return [];

  const { data: evidencesRaw } = await db.from('evidences').select('id, title').in('id', evidenceIds);
  const evidenceById = new Map((evidencesRaw ?? []).map((item) => [item.id, item]));
  return links
    .map((row) => {
      const evidence = evidenceById.get(row.evidence_id);
      if (!evidence) return null;
      return {
        evidenceId: row.evidence_id,
        nodeId: row.node_id,
        title: evidence.title,
      };
    })
    .filter((item): item is { evidenceId: string; nodeId: string; title: string } => Boolean(item));
}

function buildStepInstructions(input: {
  universeSlug: string;
  coreNodes: CoreNode[];
  evidencePairs: Array<{ evidenceId: string; title: string; nodeId: string }>;
  guidedQuestions: string[];
  guidedNodeId: string | null;
}): QuickStep[] {
  const firstNodes = input.coreNodes.slice(0, 2);
  const nodeText =
    firstNodes.length > 0
      ? firstNodes.map((node) => node.title).join(' e ')
      : 'os nos centrais do universo';
  const topEvidenceIds = input.evidencePairs.slice(0, 2).map((item) => item.evidenceId);
  const evidenceText =
    input.evidencePairs.length > 0
      ? input.evidencePairs.slice(0, 2).map((item) => item.title).join(' | ')
      : 'evidencias-chave do universo';
  const guidedQuestion =
    input.guidedQuestions[0] ?? 'Quais sao os principais achados e limitacoes deste no?';
  const questionsText =
    input.guidedQuestions.length > 0
      ? input.guidedQuestions.slice(0, 2).join(' | ')
      : 'Quais sao os principais achados? | Quais lacunas permanecem?';

  return [
    {
      title: 'Visao geral do universo',
      instruction: `Leia o Hub em 2 minutos e anote 3 pontos centrais. CTA: /c/${input.universeSlug}`,
      nodeId: firstNodes[0]?.id ?? null,
      evidenceId: null,
      requiredEvidenceIds: null,
      guidedQuestion: null,
      guidedNodeId: null,
      requiresQuestion: false,
    },
    {
      title: 'Explore o Mapa',
      instruction: `Navegue pelo Mapa e abra os nos: ${nodeText}. CTA: /c/${input.universeSlug}/mapa`,
      nodeId: firstNodes[0]?.id ?? null,
      evidenceId: null,
      requiredEvidenceIds: null,
      guidedQuestion: null,
      guidedNodeId: null,
      requiresQuestion: false,
    },
    {
      title: 'Leia evidencias-chave',
      instruction: `Comece pelas evidencias: ${evidenceText}. CTA: /c/${input.universeSlug}/provas`,
      nodeId: firstNodes[1]?.id ?? firstNodes[0]?.id ?? null,
      evidenceId: topEvidenceIds[0] ?? null,
      requiredEvidenceIds: topEvidenceIds.length > 0 ? topEvidenceIds : null,
      guidedQuestion: null,
      guidedNodeId: null,
      requiresQuestion: false,
    },
    {
      title: 'Faca perguntas guiadas',
      instruction: `No Debate, use estas perguntas: ${questionsText}. CTA: /c/${input.universeSlug}/debate`,
      nodeId: firstNodes[0]?.id ?? null,
      evidenceId: null,
      requiredEvidenceIds: null,
      guidedQuestion,
      guidedNodeId: input.guidedNodeId,
      requiresQuestion: true,
    },
    {
      title: 'Lacunas e proximas portas',
      instruction: `Revise limitacoes e avance por Provas/Trilhas para fechar lacunas. CTA: /c/${input.universeSlug}/provas`,
      nodeId: null,
      evidenceId: null,
      requiredEvidenceIds: null,
      guidedQuestion: null,
      guidedNodeId: null,
      requiresQuestion: false,
    },
  ];
}

async function upsertQuickStartSteps(trailId: string, steps: QuickStep[]) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return;
  await db.from('trail_steps').delete().eq('trail_id', trailId);
  await db.from('trail_steps').insert(
    steps.map((step, index) => ({
      trail_id: trailId,
      step_order: index + 1,
      title: step.title,
      instruction: step.instruction,
      node_id: step.nodeId,
      evidence_id: step.evidenceId,
      required_evidence_ids: step.requiredEvidenceIds,
      guided_question: step.guidedQuestion,
      guided_node_id: step.guidedNodeId,
      requires_question: step.requiresQuestion,
    })),
  );
}

export async function ensureQuickStartTrail(universeId: string, universeSlug: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;

  const { data: existing } = await db
    .from('trails')
    .select('id, slug, title')
    .eq('universe_id', universeId)
    .eq('slug', 'comece-aqui')
    .maybeSingle();

  if (existing?.id) {
    const { data: stepRows } = await db
      .from('trail_steps')
      .select('required_evidence_ids, guided_question, requires_question')
      .eq('trail_id', existing.id);
    const hasEvidenceTask = (stepRows ?? []).some(
      (step) => Array.isArray(step.required_evidence_ids) && step.required_evidence_ids.length > 0,
    );
    const hasQuestionTask = (stepRows ?? []).some(
      (step) => Boolean(step.guided_question && step.guided_question.trim()) && Boolean(step.requires_question),
    );
    if (!hasEvidenceTask || !hasQuestionTask) {
      await regenerateQuickStartTrail(universeId, universeSlug);
    }
    return existing.id;
  }

  const { data: created } = await db
    .from('trails')
    .insert({
      universe_id: universeId,
      slug: 'comece-aqui',
      title: 'Comece Aqui',
      summary: 'Percurso inicial em 5 passos para entrar no universo.',
      is_system: true,
    })
    .select('id')
    .maybeSingle();

  const trailId = created?.id ?? null;
  if (!trailId) return null;

  const coreNodes = await getCoreNodes(universeId);
  const evidences = await getTopEvidenceForCoreNodes(
    universeId,
    coreNodes.map((node) => node.id),
  );
  const quickQuestions = await getQuickQuestions(universeId);
  const guidedFromNode = quickQuestions.find((item) => item.nodeSlug);
  const guidedNode = guidedFromNode
    ? coreNodes.find((node) => node.slug === guidedFromNode.nodeSlug)
    : coreNodes[0] ?? null;
  const steps = buildStepInstructions({
    universeSlug,
    coreNodes,
    evidencePairs: evidences,
    guidedQuestions: quickQuestions.map((item) => item.question),
    guidedNodeId: guidedNode?.id ?? null,
  });
  await upsertQuickStartSteps(trailId, steps);
  return trailId;
}

export async function regenerateQuickStartTrail(universeId: string, universeSlug: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;

  const { data: trail } = await db
    .from('trails')
    .select('id')
    .eq('universe_id', universeId)
    .eq('slug', 'comece-aqui')
    .maybeSingle();

  if (!trail?.id) {
    return ensureQuickStartTrail(universeId, universeSlug);
  }

  const coreNodes = await getCoreNodes(universeId);
  const evidences = await getTopEvidenceForCoreNodes(
    universeId,
    coreNodes.map((node) => node.id),
  );
  const quickQuestions = await getQuickQuestions(universeId);
  const guidedFromNode = quickQuestions.find((item) => item.nodeSlug);
  const guidedNode = guidedFromNode
    ? coreNodes.find((node) => node.slug === guidedFromNode.nodeSlug)
    : coreNodes[0] ?? null;
  const steps = buildStepInstructions({
    universeSlug,
    coreNodes,
    evidencePairs: evidences,
    guidedQuestions: quickQuestions.map((item) => item.question),
    guidedNodeId: guidedNode?.id ?? null,
  });
  await upsertQuickStartSteps(trail.id, steps);
  return trail.id;
}
