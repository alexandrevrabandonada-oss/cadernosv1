import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { getBootstrappedMockUniverseBySlug, listBootstrappedMockUniverses, upsertBootstrappedMockUniverse } from '@/lib/universe/bootstrapMock';
import { bootstrapUniverseFromTemplate, bootstrapUniverseWorkflow } from '@/lib/universe/bootstrap';
import type { UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';
import { addUniverseToProgram, createEditorialProgram, getEditorialProgram } from '@/lib/editorial/program';

export type EditorialBatchUniversePlan = {
  title: string;
  slug: string;
  summary: string;
  templateId: UniverseBootstrapTemplateId;
  priority: number;
  currentLane: 'bootstrap';
  nextLane: 'ingest' | 'quality' | 'sprint';
  objective: string;
  sourcePriorities: string[];
  weeklyGoal: string;
  metas: {
    docsImported: number;
    docsProcessed: number;
    evidencesDraft: number;
    evidencesPublished: number;
    highlights: number;
  };
  observations: string[];
};

export const EDITORIAL_PROGRAM_2026 = {
  title: 'Programa Editorial 2026',
  slug: 'programa-editorial-2026',
  summary: 'Lote inicial de tres universos reais operados em paralelo com bootstrap, ingest, quality e publish.',
} as const;

const BATCH_2026: EditorialBatchUniversePlan[] = [
  {
    title: 'Saude e Poluicao em Volta Redonda',
    slug: 'saude-poluicao-vr',
    summary: 'Universo para organizar impactos na saude, evidencias, disputas publicas e monitoramento sobre poluicao em Volta Redonda.',
    templateId: 'issue_investigation',
    priority: 3,
    currentLane: 'bootstrap',
    nextLane: 'ingest',
    objective: 'Abrir um universo estrutural de investigacao para ligar impactos, atores, evidencias e monitoramento continuo.',
    sourcePriorities: [
      'estudos epidemiologicos e tecnicos sobre qualidade do ar',
      'boletins de vigilancia em saude',
      'decisoes, TACs e notas tecnicas de orgaos publicos',
      'series historicas de indicadores ambientais',
    ],
    weeklyGoal: 'Subir a primeira base documental minima para comecar ingest e quality pass.',
    metas: { docsImported: 12, docsProcessed: 8, evidencesDraft: 10, evidencesPublished: 4, highlights: 6 },
    observations: [
      'Prioridade editorial alta por ser o recorte mais proximo da linha principal de investigacao.',
      'Deve puxar primeiro fontes tecnico-institucionais antes de ampliar clipping jornalistico.',
    ],
  },
  {
    title: 'Memoria Industrial de Volta Redonda',
    slug: 'memoria-industrial-vr',
    summary: 'Universo voltado a memoria urbana, bairros, ocupacao industrial e transformacoes do territorio ao longo do tempo.',
    templateId: 'territorial_memory',
    priority: 2,
    currentLane: 'bootstrap',
    nextLane: 'ingest',
    objective: 'Abrir um acervo de memoria territorial com marcos, atores locais, conflitos e camadas de memoria coletiva.',
    sourcePriorities: [
      'acervos locais, jornais historicos e fotografias',
      'planos urbanos, memoria institucional e mapas historicos',
      'testemunhos e cronologias comunitarias',
      'registros de bairros, ocupacao e deslocamento urbano',
    ],
    weeklyGoal: 'Montar a primeira cronologia documental e localizar os marcos historicos basicos do territorio.',
    metas: { docsImported: 10, docsProcessed: 6, evidencesDraft: 8, evidencesPublished: 3, highlights: 5 },
    observations: [
      'Prioridade media porque depende de acervo e organizacao cronologica antes de ganhar ritmo de review.',
      'A trilha Comece Aqui deve puxar rapidamente territorio, marcos e memorias.',
    ],
  },
  {
    title: 'Respira Fundo Monitoramento',
    slug: 'respira-fundo-monitoramento',
    summary: 'Universo de monitoramento continuo para clipping, sinais da semana, share pack e resposta editorial rapida.',
    templateId: 'campaign_watch',
    priority: 3,
    currentLane: 'bootstrap',
    nextLane: 'ingest',
    objective: 'Operar um universo leve e rapido para sinais quentes, clipping e base semanal de resposta.',
    sourcePriorities: [
      'clipping local e regional',
      'agenda publica e marcos da semana',
      'posts institucionais e atualizacoes de campanha',
      'threads e perguntas recorrentes para share pack',
    ],
    weeklyGoal: 'Garantir uma base curta de documentos e sinais para alimentar clipping e share pack.',
    metas: { docsImported: 8, docsProcessed: 5, evidencesDraft: 6, evidencesPublished: 2, highlights: 6 },
    observations: [
      'Prioridade alta porque deve provar o fluxo rapido de monitoramento e highlights semanais.',
      'E um universo bom para testar a transicao bootstrap -> ingest -> highlights.',
    ],
  },
];

function shouldUseMockBatch() {
  return process.env.TEST_SEED === '1' || !getSupabaseServiceRoleClient();
}

export function getEditorialBatch2026Plan() {
  return BATCH_2026.map((item) => ({ ...item, sourcePriorities: [...item.sourcePriorities], observations: [...item.observations], metas: { ...item.metas } }));
}

async function findUniverseBySlug(slug: string) {
  if (shouldUseMockBatch()) {
    const found = getBootstrappedMockUniverseBySlug(slug) ?? listBootstrappedMockUniverses().find((item) => item.slug === slug) ?? null;
    if (!found) return null;
    return { id: found.id, slug: found.slug, title: found.title, summary: found.summary };
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data } = await db.from('universes').select('id, slug, title, summary').eq('slug', slug).maybeSingle();
  return data ? { id: data.id, slug: data.slug, title: data.title, summary: data.summary ?? 'Universo em preparacao.' } : null;
}

async function alignUniverseMeta(input: { id: string; slug: string; title: string; summary: string }) {
  if (shouldUseMockBatch()) {
    upsertBootstrappedMockUniverse({
      id: input.id,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      published: false,
      publishedAt: null,
      isFeatured: false,
      featuredRank: 0,
      focusNote: null,
      focusOverride: false,
    });
    return;
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return;
  await db.from('universes').update({
    title: input.title,
    summary: input.summary,
    published: false,
    published_at: null,
    is_featured: false,
    featured_rank: 0,
    focus_note: null,
    focus_override: false,
  }).eq('id', input.id);
}

async function ensureUniverseFromPlan(plan: EditorialBatchUniversePlan, userId?: string | null) {
  const existing = await findUniverseBySlug(plan.slug);
  if (!existing) {
    return bootstrapUniverseWorkflow({
      mode: 'template',
      universe: {
        title: plan.title,
        slug: plan.slug,
        summary: plan.summary,
        publishNow: false,
      },
      templateId: plan.templateId,
      userId: userId ?? null,
    });
  }

  await alignUniverseMeta({ id: existing.id, slug: plan.slug, title: plan.title, summary: plan.summary });
  await bootstrapUniverseFromTemplate({
    universeId: existing.id,
    universeSlug: existing.slug,
    templateId: plan.templateId,
    userId: userId ?? null,
  });
  return existing;
}

export async function ensureEditorialProgram2026Batch(userId?: string | null) {
  const program = (await getEditorialProgram(EDITORIAL_PROGRAM_2026.slug)) ?? (await createEditorialProgram({
    title: EDITORIAL_PROGRAM_2026.title,
    slug: EDITORIAL_PROGRAM_2026.slug,
    summary: EDITORIAL_PROGRAM_2026.summary,
    userId: userId ?? null,
  }));

  const universes = [] as Array<{ id: string; slug: string; title: string; templateId: UniverseBootstrapTemplateId; priority: number }>;
  for (const plan of BATCH_2026) {
    const universe = await ensureUniverseFromPlan(plan, userId ?? null);
    await addUniverseToProgram({
      programId: program.id,
      universeId: universe.id,
      lane: 'bootstrap',
      priority: plan.priority,
      note: `Proxima lane: ${plan.nextLane}. Fontes: ${plan.sourcePriorities.slice(0, 2).join(' + ')}`,
    });
    universes.push({ id: universe.id, slug: universe.slug, title: universe.title, templateId: plan.templateId, priority: plan.priority });
  }

  return { program, universes, plans: getEditorialBatch2026Plan() };
}
