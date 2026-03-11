import 'server-only';
import { getHubData } from '@/lib/data/universe';
import { listPublishedUniverses, type UniverseRecord } from '@/lib/data/universes';
import { getWeekKey, getWeeklyPack } from '@/lib/share/pack';
import { buildUniverseHref } from '@/lib/universeNav';

export type HomeEditorialSignal = {
  id: string;
  type: 'evidence' | 'event' | 'thread' | 'term' | 'node' | 'pack';
  label: string;
  title: string;
  description: string;
  href: string;
  universeSlug: string;
  meta?: string;
};

export type HomeEditorialUniverse = UniverseRecord & {
  nodes: number;
  trails: number;
  evidences: number;
};

export type HomeEditorialState = {
  focusUniverse: HomeEditorialUniverse | null;
  featuredUniverses: HomeEditorialUniverse[];
  signals: HomeEditorialSignal[];
  hasPublishedUniverses: boolean;
};

type RankedUniverse = HomeEditorialUniverse & {
  signalStrength: number;
};

function scoreUniverse(universe: HomeEditorialUniverse) {
  let score = 0;
  if (universe.focus_override) score += 5000;
  if (universe.is_featured) score += 1000;
  score += Math.max(0, 100 - universe.featured_rank);
  if (universe.hasHighlights) score += 120;
  score += universe.evidences * 4;
  score += universe.trails * 3;
  score += universe.nodes;
  if (universe.published_at) score += Math.max(0, Date.parse(universe.published_at) / 1_000_000_000_000);
  return score;
}

function compareUniverses(a: RankedUniverse, b: RankedUniverse) {
  if (a.focus_override !== b.focus_override) return a.focus_override ? -1 : 1;
  if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
  if (a.featured_rank !== b.featured_rank) return a.featured_rank - b.featured_rank;
  if (a.signalStrength !== b.signalStrength) return b.signalStrength - a.signalStrength;
  return (b.published_at ?? '').localeCompare(a.published_at ?? '');
}

export function resolveHomeEditorialState(input: {
  universes: HomeEditorialUniverse[];
  signalsByUniverse: Record<string, HomeEditorialSignal[]>;
}): HomeEditorialState {
  const ranked = input.universes
    .map((universe) => ({
      ...universe,
      signalStrength: scoreUniverse(universe) + (input.signalsByUniverse[universe.slug]?.length ?? 0) * 20,
    }))
    .sort(compareUniverses);

  const focusUniverse = ranked[0] ?? null;
  const featuredUniverses = ranked.slice(0, 6).map((universe) => ({ ...universe } as HomeEditorialUniverse));
  const signalPool = (focusUniverse ? input.signalsByUniverse[focusUniverse.slug] ?? [] : []).concat(
    featuredUniverses
      .flatMap((universe) => input.signalsByUniverse[universe.slug] ?? [])
      .filter((item) => item.universeSlug !== focusUniverse?.slug),
  );

  const signals: HomeEditorialSignal[] = [];
  const usedTypes = new Set<string>();
  const usedIds = new Set<string>();
  for (const signal of signalPool) {
    if (usedIds.has(signal.id)) continue;
    const preferDiversity = !usedTypes.has(signal.type) || signals.length >= 3;
    if (!preferDiversity) continue;
    signals.push(signal);
    usedTypes.add(signal.type);
    usedIds.add(signal.id);
    if (signals.length >= 5) break;
  }

  return {
    focusUniverse: focusUniverse ? ({ ...focusUniverse } as HomeEditorialUniverse) : null,
    featuredUniverses,
    signals,
    hasPublishedUniverses: ranked.length > 0,
  };
}

function buildSignalsForHub(input: {
  universe: HomeEditorialUniverse;
  highlights: Awaited<ReturnType<typeof getHubData>>['highlights'];
  coreNodes: Awaited<ReturnType<typeof getHubData>>['coreNodes'];
  quickQuestions: Awaited<ReturnType<typeof getHubData>>['quickStart']['questions'];
  packTitle?: string | null;
}) {
  const signals: HomeEditorialSignal[] = [];
  for (const item of input.highlights.evidences.slice(0, 2)) {
    signals.push({
      id: `evidence:${input.universe.slug}:${item.id}`,
      type: 'evidence',
      label: 'Prova',
      title: item.title,
      description: item.summary,
      href: buildUniverseHref(input.universe.slug, `provas?selected=${encodeURIComponent(item.id)}&panel=detail`),
      universeSlug: input.universe.slug,
      meta: item.nodeSlug ? `no:${item.nodeSlug}` : 'evidencia publicada',
    });
  }
  for (const item of input.highlights.events.slice(0, 1)) {
    signals.push({
      id: `event:${input.universe.slug}:${item.id}`,
      type: 'event',
      label: 'Marco',
      title: item.title,
      description: item.kind ? `${item.kind}${item.day ? ` - ${new Date(item.day).toLocaleDateString('pt-BR')}` : ''}` : 'Evento do universo',
      href: buildUniverseHref(input.universe.slug, `linha?selected=${encodeURIComponent(item.id)}&panel=detail`),
      universeSlug: input.universe.slug,
      meta: 'linha viva',
    });
  }
  for (const item of input.highlights.questions.slice(0, 1)) {
    signals.push({
      id: `thread:${input.universe.slug}:${item.question}`,
      type: 'thread',
      label: 'Pergunta',
      title: item.question,
      description: 'Pergunta destacada para abrir debate orientado por evidencia.',
      href: buildUniverseHref(
        input.universe.slug,
        `debate?q=${encodeURIComponent(item.question)}${item.nodeSlug ? `&node=${encodeURIComponent(item.nodeSlug)}` : ''}`,
      ),
      universeSlug: input.universe.slug,
      meta: 'debate',
    });
  }
  const quickQuestion = input.quickQuestions[0];
  if (quickQuestion) {
    signals.push({
      id: `term:${input.universe.slug}:${quickQuestion.question}`,
      type: 'term',
      label: 'Termo',
      title: quickQuestion.label || 'Pergunta de partida',
      description: quickQuestion.question,
      href: buildUniverseHref(input.universe.slug, 'glossario'),
      universeSlug: input.universe.slug,
      meta: 'indice conceitual',
    });
  }
  const leadNode = input.coreNodes[0];
  if (leadNode) {
    signals.push({
      id: `node:${input.universe.slug}:${leadNode.id}`,
      type: 'node',
      label: 'No',
      title: leadNode.label,
      description: leadNode.summary ?? 'Porta conceitual principal do universo.',
      href: buildUniverseHref(input.universe.slug, `mapa?node=${encodeURIComponent(leadNode.slug ?? '')}&panel=detail`),
      universeSlug: input.universe.slug,
      meta: 'mapa',
    });
  }
  if (input.packTitle) {
    signals.push({
      id: `pack:${input.universe.slug}:${input.packTitle}`,
      type: 'pack',
      label: 'Pack',
      title: input.packTitle,
      description: 'Selecao editorial semanal publicada para circular o universo.',
      href: buildUniverseHref(input.universe.slug, 's'),
      universeSlug: input.universe.slug,
      meta: 'share pack',
    });
  }
  return signals;
}

export async function getHomeEditorialState(query = ''): Promise<HomeEditorialState> {
  const universes = await listPublishedUniverses({ q: query });
  if (universes.length === 0) {
    return {
      focusUniverse: null,
      featuredUniverses: [],
      signals: [],
      hasPublishedUniverses: false,
    };
  }

  const universesWithMetrics = await Promise.all(
    universes.slice(0, 6).map(async (universe) => {
      const hub = await getHubData(universe.slug);
      return {
        universe: {
          ...universe,
          nodes: hub.quickStart.nodesTotal,
          trails: hub.featuredTrails.length,
          evidences: hub.quickStart.evidencesTotal,
        } satisfies HomeEditorialUniverse,
        hub,
      };
    }),
  );

  const signalsByUniverse: Record<string, HomeEditorialSignal[]> = {};
  for (const item of universesWithMetrics) {
    const pack = item.hub.universeId ? await getWeeklyPack(item.hub.universeId, getWeekKey()) : null;
    signalsByUniverse[item.universe.slug] = buildSignalsForHub({
      universe: item.universe,
      highlights: item.hub.highlights,
      coreNodes: item.hub.coreNodes,
      quickQuestions: item.hub.quickStart.questions,
      packTitle: pack?.title ?? null,
    });
  }

  return resolveHomeEditorialState({
    universes: universesWithMetrics.map((item) => item.universe),
    signalsByUniverse,
  });
}
