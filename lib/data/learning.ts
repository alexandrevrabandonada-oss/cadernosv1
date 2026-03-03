import 'server-only';
import { getUniverseMock } from '@/lib/mock/universe';
import { getSupabaseServerClient, isSupabaseServerEnvConfigured } from '@/lib/supabase/server';

export type TrailStepView = {
  id: string;
  order: number;
  title: string;
  instruction: string;
  nodeTitle: string | null;
  evidenceTitle: string | null;
};

export type TrailView = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  steps: TrailStepView[];
};

export type ReadingLesson = {
  id: string;
  title: string;
  prompt: string;
  guidedQuestions: string[];
  recommendedEvidence: Array<{
    id: string;
    title: string;
    summary: string;
    docTitle: string | null;
  }>;
};

export type PathSuggestionStep = {
  id: string;
  order: number;
  title: string;
  instruction: string;
  nodeTitle: string | null;
  portalPath: 'mapa' | 'provas' | 'linha' | 'trilhas' | 'debate' | 'tutoria';
};

export type TutoriaData = {
  source: 'db' | 'mock';
  universeTitle: string;
  readingLessons: ReadingLesson[];
  pathSteps: PathSuggestionStep[];
};

async function getUniverseContext(slug: string) {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data } = await db.from('universes').select('id, title').eq('slug', slug).maybeSingle();
  return data ?? null;
}

function mockTrails(slug: string): TrailView[] {
  const mock = getUniverseMock(slug);
  const nodes = mock.coreNodes;
  return [
    {
      id: `${slug}-trail-1`,
      slug: 'visao-geral',
      title: 'Trilha de Visao Geral',
      summary: 'Percurso rapido para contextualizar conceitos, eventos e evidencias.',
      steps: nodes.slice(0, 4).map((node, idx) => ({
        id: `${slug}-trail-1-step-${idx + 1}`,
        order: idx + 1,
        title: `Passo ${idx + 1}: ${node.label}`,
        instruction: `Leia o contexto do no "${node.label}" e registre um insight pratico.`,
        nodeTitle: node.label,
        evidenceTitle: idx >= 2 ? 'Evidencia recomendada (mock)' : null,
      })),
    },
    {
      id: `${slug}-trail-2`,
      slug: 'aprofundamento',
      title: 'Trilha de Aprofundamento',
      summary: 'Percurso de aprofundamento com foco em hipotese e debate.',
      steps: nodes.slice(3, 7).map((node, idx) => ({
        id: `${slug}-trail-2-step-${idx + 1}`,
        order: idx + 1,
        title: `Etapa ${idx + 1}: ${node.label}`,
        instruction: `Relacione "${node.label}" com as evidencias disponiveis e anote duvidas.`,
        nodeTitle: node.label,
        evidenceTitle: 'Evidencia recomendada (mock)',
      })),
    },
  ];
}

export async function getTrailsData(slug: string): Promise<{ source: 'db' | 'mock'; universeTitle: string; trails: TrailView[] }> {
  const mock = getUniverseMock(slug);
  if (!isSupabaseServerEnvConfigured()) {
    return { source: 'mock', universeTitle: mock.title, trails: mockTrails(slug) };
  }

  const db = getSupabaseServerClient();
  if (!db) {
    return { source: 'mock', universeTitle: mock.title, trails: mockTrails(slug) };
  }

  const universe = await getUniverseContext(slug);
  if (!universe) {
    return { source: 'mock', universeTitle: mock.title, trails: mockTrails(slug) };
  }

  const { data: trailsRaw } = await db
    .from('trails')
    .select('id, slug, title, summary')
    .eq('universe_id', universe.id)
    .order('created_at', { ascending: true });

  if (!trailsRaw || trailsRaw.length === 0) {
    return { source: 'mock', universeTitle: universe.title, trails: mockTrails(slug) };
  }

  const trails: TrailView[] = [];
  for (const trail of trailsRaw) {
    const { data: stepsRaw } = await db
      .from('trail_steps')
      .select('id, step_order, title, instruction, node_id, evidence_id')
      .eq('trail_id', trail.id)
      .order('step_order', { ascending: true });

    const nodeIds = Array.from(new Set((stepsRaw ?? []).map((step) => step.node_id).filter(Boolean)));
    const evidenceIds = Array.from(new Set((stepsRaw ?? []).map((step) => step.evidence_id).filter(Boolean)));

    const [{ data: nodesRaw }, { data: evidencesRaw }] = await Promise.all([
      nodeIds.length > 0 ? db.from('nodes').select('id, title').in('id', nodeIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      evidenceIds.length > 0 ? db.from('evidences').select('id, title').in('id', evidenceIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    ]);

    const nodeById = new Map((nodesRaw ?? []).map((node) => [node.id, node.title]));
    const evidenceById = new Map((evidencesRaw ?? []).map((ev) => [ev.id, ev.title]));

    trails.push({
      id: trail.id,
      slug: trail.slug,
      title: trail.title,
      summary: trail.summary,
      steps: (stepsRaw ?? []).map((step) => ({
        id: step.id,
        order: step.step_order,
        title: step.title,
        instruction: step.instruction ?? 'Sem instrucao detalhada.',
        nodeTitle: step.node_id ? nodeById.get(step.node_id) ?? null : null,
        evidenceTitle: step.evidence_id ? evidenceById.get(step.evidence_id) ?? null : null,
      })),
    });
  }

  return { source: 'db', universeTitle: universe.title, trails };
}

function mockTutoria(slug: string): TutoriaData {
  const mock = getUniverseMock(slug);
  const readingLessons: ReadingLesson[] = [
    {
      id: `${slug}-lesson-1`,
      title: 'Leitura Orientada: contexto e atores',
      prompt: 'Identifique relacoes entre contexto inicial e agentes centrais.',
      guidedQuestions: [
        'Que evidencia sustenta o contexto inicial?',
        'Quais termos aparecem com maior frequencia?',
        'Que duvida permanece aberta apos a leitura?',
      ],
      recommendedEvidence: [
        {
          id: `${slug}-ev-1`,
          title: 'Evidencia base (mock)',
          summary: 'Trecho introdutorio para ancorar leitura.',
          docTitle: 'Documento mock A',
        },
      ],
    },
    {
      id: `${slug}-lesson-2`,
      title: 'Leitura Critica: hipotese e contrapontos',
      prompt: 'Confronte a hipotese principal com contra-argumentos.',
      guidedQuestions: [
        'Qual afirmacao depende de mais provas?',
        'Quais dados contradizem a narrativa principal?',
        'Que pergunta faria para validar a conclusao?',
      ],
      recommendedEvidence: [
        {
          id: `${slug}-ev-2`,
          title: 'Fonte secundaria (mock)',
          summary: 'Trecho complementar para triangulacao.',
          docTitle: 'Documento mock B',
        },
      ],
    },
  ];

  const pathSteps: PathSuggestionStep[] = mock.coreNodes.slice(0, 6).map((node, idx) => ({
    id: `${slug}-path-${idx + 1}`,
    order: idx + 1,
    title: `Percurso ${idx + 1}: ${node.label}`,
    instruction: `Revise o no "${node.label}" e avance para a porta sugerida.`,
    nodeTitle: node.label,
    portalPath: (['mapa', 'provas', 'linha', 'debate', 'trilhas', 'tutoria'][idx] ?? 'mapa') as PathSuggestionStep['portalPath'],
  }));

  return {
    source: 'mock',
    universeTitle: mock.title,
    readingLessons,
    pathSteps,
  };
}

export async function getTutoriaData(slug: string): Promise<TutoriaData> {
  if (!isSupabaseServerEnvConfigured()) return mockTutoria(slug);
  const db = getSupabaseServerClient();
  if (!db) return mockTutoria(slug);

  const universe = await getUniverseContext(slug);
  if (!universe) return mockTutoria(slug);

  const { data: modulesRaw } = await db
    .from('tutor_modules')
    .select('id, slug, title, summary')
    .eq('universe_id', universe.id)
    .order('created_at', { ascending: true });

  if (!modulesRaw || modulesRaw.length === 0) {
    return { ...mockTutoria(slug), source: 'db', universeTitle: universe.title };
  }

  const readingLessons: ReadingLesson[] = [];
  const pathSteps: PathSuggestionStep[] = [];

  for (const tutorModule of modulesRaw) {
    const { data: stepsRaw } = await db
      .from('tutor_steps')
      .select('id, step_order, title, instruction, node_id, evidence_id')
      .eq('tutor_module_id', tutorModule.id)
      .order('step_order', { ascending: true });

    const nodeIds = Array.from(new Set((stepsRaw ?? []).map((step) => step.node_id).filter(Boolean)));
    const evidenceIds = Array.from(new Set((stepsRaw ?? []).map((step) => step.evidence_id).filter(Boolean)));

    const [{ data: nodesRaw }, { data: evidencesRaw }] = await Promise.all([
      nodeIds.length > 0 ? db.from('nodes').select('id, title').in('id', nodeIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      evidenceIds.length > 0
        ? db.from('evidences').select('id, title, summary, document_id').in('id', evidenceIds)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string; summary: string; document_id: string | null }> }),
    ]);

    const nodeById = new Map((nodesRaw ?? []).map((node) => [node.id, node.title]));
    const evidenceById = new Map((evidencesRaw ?? []).map((ev) => [ev.id, ev]));

    const readingQuestions = (stepsRaw ?? [])
      .slice(0, 3)
      .map((step) => step.instruction || `Como validar o passo ${step.title}?`);

    const recommendedEvidence = (stepsRaw ?? [])
      .map((step) => (step.evidence_id ? evidenceById.get(step.evidence_id) : null))
      .filter((ev): ev is { id: string; title: string; summary: string; document_id: string | null } => Boolean(ev))
      .slice(0, 3)
      .map((ev) => ({
        id: ev.id,
        title: ev.title,
        summary: ev.summary,
        docTitle: null,
      }));

    readingLessons.push({
      id: tutorModule.id,
      title: tutorModule.title,
      prompt: tutorModule.summary,
      guidedQuestions: readingQuestions.length > 0 ? readingQuestions : ['Que conceito-chave aparece neste modulo?'],
      recommendedEvidence,
    });

    pathSteps.push(
      ...(stepsRaw ?? []).map((step, idx) => ({
        id: step.id,
        order: step.step_order,
        title: step.title,
        instruction: step.instruction ?? 'Siga para a proxima porta recomendada.',
        nodeTitle: step.node_id ? nodeById.get(step.node_id) ?? null : null,
        portalPath: (['mapa', 'provas', 'linha', 'debate', 'trilhas', 'tutoria'][idx % 6] ??
          'mapa') as PathSuggestionStep['portalPath'],
      })),
    );
  }

  return {
    source: 'db',
    universeTitle: universe.title,
    readingLessons,
    pathSteps,
  };
}
