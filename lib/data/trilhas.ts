import 'server-only';
import { getUniverseMock } from '@/lib/mock/universe';
import { getTrailsData, type TrailStepView, type TrailView } from '@/lib/data/learning';
import { getSupabaseServerClient, isSupabaseServerEnvConfigured } from '@/lib/supabase/server';

export type TrailListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  stepsCount: number;
  hasGuided: boolean;
  hasRequiredEvidence: boolean;
  estimatedMinutes: number;
  isQuickStart: boolean;
  focus: string[];
};

export type TrilhasV2Data = {
  source: 'db' | 'mock';
  universeId: string | null;
  universeTitle: string;
  trails: TrailListItem[];
  trailById: Map<string, TrailView>;
  trailBySlug: Map<string, TrailView>;
  coreNodes: Array<{ id: string; slug: string; title: string }>;
  tags: string[];
};

function estimateMinutes(stepsCount: number) {
  return Math.max(5, stepsCount * 3);
}

function deriveTrailList(trails: TrailView[]): TrailListItem[] {
  return trails.map((trail) => {
    const hasGuided = trail.steps.some((step) => Boolean(step.guidedQuestion));
    const hasRequiredEvidence = trail.steps.some((step) => (step.requiredEvidenceIds?.length ?? 0) > 0);
    const focus = Array.from(
      new Set(
        trail.steps
          .map((step) => step.nodeTitle ?? step.nodeSlug ?? '')
          .filter(Boolean)
          .slice(0, 3),
      ),
    );
    return {
      id: trail.id,
      slug: trail.slug,
      title: trail.title,
      summary: trail.summary,
      stepsCount: trail.steps.length,
      hasGuided,
      hasRequiredEvidence,
      estimatedMinutes: estimateMinutes(trail.steps.length),
      isQuickStart: trail.slug === 'comece-aqui',
      focus,
    };
  });
}

function deriveMockBranches(slug: string) {
  const mock = getUniverseMock(slug);
  return {
    coreNodes: mock.coreNodes.slice(0, 8).map((node) => ({
      id: node.id,
      slug: node.slug ?? node.id,
      title: node.label,
    })),
    tags: Array.from(new Set(mock.coreNodes.flatMap((node) => node.tags ?? []).filter(Boolean))).slice(0, 16),
  };
}

async function deriveDbBranches(universeId: string) {
  const db = getSupabaseServerClient();
  if (!db) return { coreNodes: [] as Array<{ id: string; slug: string; title: string }>, tags: [] as string[] };
  const { data: nodesRaw } = await db
    .from('nodes')
    .select('id, slug, title, kind, tags')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: true })
    .limit(80);
  const nodes = nodesRaw ?? [];
  const coreNodes = nodes
    .filter((node) => node.kind === 'core' || (node.tags ?? []).includes('core'))
    .slice(0, 9)
    .map((node) => ({ id: node.id, slug: node.slug, title: node.title }));
  const fallbackNodes = coreNodes.length > 0 ? coreNodes : nodes.slice(0, 9).map((node) => ({ id: node.id, slug: node.slug, title: node.title }));
  const tags = Array.from(new Set(nodes.flatMap((node) => node.tags ?? []).filter(Boolean))).slice(0, 24);
  return { coreNodes: fallbackNodes, tags };
}

export async function getTrilhasV2Data(slug: string): Promise<TrilhasV2Data> {
  const data = await getTrailsData(slug);
  const trails = deriveTrailList(data.trails);
  trails.sort((a, b) => {
    if (a.isQuickStart !== b.isQuickStart) return a.isQuickStart ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
  const trailById = new Map(data.trails.map((trail) => [trail.id, trail]));
  const trailBySlug = new Map(data.trails.map((trail) => [trail.slug, trail]));

  const branches =
    data.universeId && isSupabaseServerEnvConfigured()
      ? await deriveDbBranches(data.universeId)
      : deriveMockBranches(slug);

  return {
    source: data.source,
    universeId: data.universeId,
    universeTitle: data.universeTitle,
    trails,
    trailById,
    trailBySlug,
    coreNodes: branches.coreNodes,
    tags: branches.tags,
  };
}

export function resolveTrail(data: TrilhasV2Data, ref: string | undefined | null) {
  if (!ref) return data.trailBySlug.get('comece-aqui') ?? data.trailById.values().next().value ?? null;
  return data.trailBySlug.get(ref) ?? data.trailById.get(ref) ?? null;
}

export function resolveActiveStep(trail: TrailView | null, stepParam: string | undefined | null): TrailStepView | null {
  if (!trail || trail.steps.length === 0) return null;
  const parsed = Number(stepParam);
  if (!Number.isFinite(parsed) || parsed < 1) return trail.steps[0] ?? null;
  const byOrder = trail.steps.find((step) => step.order === parsed);
  return byOrder ?? trail.steps[0] ?? null;
}
