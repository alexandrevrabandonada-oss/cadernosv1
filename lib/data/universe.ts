import { getUniverseMock, type UniverseNode } from '@/lib/mock/universe';
import { listNodeLinkCounts } from '@/lib/data/nodeLinks';
import { getQuickQuestions, type QuickQuestion } from '@/lib/onboarding/questions';
import { ensureQuickStartTrail } from '@/lib/onboarding/quickstart';
import { getSupabaseServerClient, isSupabaseServerEnvConfigured } from '@/lib/supabase/server';

export type HubData = {
  source: 'db' | 'mock';
  universeId: string | null;
  slug: string;
  title: string;
  summary: string;
  quickStart: {
    docsProcessed: number;
    nodesTotal: number;
    evidencesTotal: number;
    trailSlug: string;
    questions: QuickQuestion[];
  };
  coreNodes: Array<UniverseNode & { docsCount?: number; evidencesCount?: number }>;
  featuredTrails: Array<{ id: string; title: string; summary: string }>;
  featuredEvidences: Array<{ id: string; title: string; summary: string }>;
};

export type MapEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  weight: number | null;
};

export type MapData = {
  source: 'db' | 'mock';
  universeId: string | null;
  slug: string;
  title: string;
  nodes: UniverseNode[];
  edges: MapEdge[];
};

export type NodeRelatedDocument = {
  id: string;
  title: string;
  year: number | null;
  status: 'uploaded' | 'processed' | 'link_only' | 'error';
};

function mapNodeKind(kind: string): UniverseNode['type'] {
  switch (kind) {
    case 'event':
      return 'evento';
    case 'person':
      return 'pessoa';
    case 'evidence':
      return 'evidencia';
    default:
      return 'conceito';
  }
}

function buildMockEdges(slug: string, nodes: UniverseNode[]): MapEdge[] {
  if (nodes.length < 2) return [];
  const edges: MapEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    edges.push({
      id: `${slug}-edge-${i + 1}`,
      fromNodeId: nodes[i].id,
      toNodeId: nodes[i + 1].id,
      label: 'conecta',
      weight: null,
    });
  }
  return edges;
}

function mockFeaturedTrails(nodes: UniverseNode[]) {
  return nodes.slice(0, 3).map((node, index) => ({
    id: `mock-trail-${index + 1}`,
    title: `Trilha ${index + 1}: ${node.label}`,
    summary: `Percurso inicial para explorar ${node.label}.`,
  }));
}

function mockFeaturedEvidences(nodes: UniverseNode[]) {
  return nodes.slice(0, 3).map((node, index) => ({
    id: `mock-evidence-${index + 1}`,
    title: `Evidencia ${index + 1}: ${node.label}`,
    summary: `Resumo curado de exemplo associado ao no ${node.label}.`,
  }));
}

function mockQuickQuestions(slug: string): QuickQuestion[] {
  const mock = getUniverseMock(slug);
  const base: QuickQuestion[] = [
    { question: 'Quais sao os principais achados deste universo?', nodeSlug: null, label: 'ACHADOS' },
    { question: 'Quais evidencias mais fortes aparecem na base?', nodeSlug: null, label: 'EVIDENCIAS' },
    { question: 'Quais sao as principais limitacoes/lacunas dos estudos?', nodeSlug: null, label: 'LACUNAS' },
  ];
  const perNode = mock.coreNodes.slice(0, 3).map((node) => ({
    question: `O que os estudos mostram sobre ${node.label}?`,
    nodeSlug: node.slug ?? null,
    label: node.label.toUpperCase().slice(0, 10),
  }));
  return [...base, ...perNode].slice(0, 8);
}

export async function getHubData(slug: string): Promise<HubData> {
  const mock = getUniverseMock(slug);
  const mockQuickStart = {
    docsProcessed: 0,
    nodesTotal: mock.coreNodes.length,
    evidencesTotal: 0,
    trailSlug: 'comece-aqui',
    questions: mockQuickQuestions(slug),
  };

  if (!isSupabaseServerEnvConfigured()) {
    return {
      source: 'mock',
      universeId: null,
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      quickStart: mockQuickStart,
      coreNodes: mock.coreNodes,
      featuredTrails: mockFeaturedTrails(mock.coreNodes),
      featuredEvidences: mockFeaturedEvidences(mock.coreNodes),
    };
  }

  const client = getSupabaseServerClient();
  if (!client) {
    return {
      source: 'mock',
      universeId: null,
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      quickStart: mockQuickStart,
      coreNodes: mock.coreNodes,
      featuredTrails: mockFeaturedTrails(mock.coreNodes),
      featuredEvidences: mockFeaturedEvidences(mock.coreNodes),
    };
  }

  try {
    const universeQuery = await client
      .from('universes')
      .select('id, title, summary')
      .eq('slug', slug)
      .maybeSingle();

    if (universeQuery.error || !universeQuery.data) {
      return {
        source: 'mock',
        universeId: null,
        slug: mock.slug,
        title: mock.title,
        summary: mock.summary,
        quickStart: mockQuickStart,
        coreNodes: mock.coreNodes,
        featuredTrails: mockFeaturedTrails(mock.coreNodes),
        featuredEvidences: mockFeaturedEvidences(mock.coreNodes),
      };
    }

    const nodesQuery = await client
      .from('nodes')
      .select('id, title, kind')
      .eq('universe_id', universeQuery.data.id)
      .order('created_at', { ascending: true })
      .limit(9);

    if (nodesQuery.error || !nodesQuery.data?.length) {
      return {
        source: 'db',
        universeId: universeQuery.data.id,
        slug,
        title: universeQuery.data.title,
        summary: universeQuery.data.summary,
        quickStart: mockQuickStart,
        coreNodes: mock.coreNodes.slice(0, 5),
        featuredTrails: mockFeaturedTrails(mock.coreNodes),
        featuredEvidences: mockFeaturedEvidences(mock.coreNodes),
      };
    }

    const coreNodes: UniverseNode[] = nodesQuery.data.map((node) => ({
      id: node.id,
      label: node.title,
      type: mapNodeKind(node.kind),
    }));
    const linkCounts = await listNodeLinkCounts(
      universeQuery.data.id,
      coreNodes.map((node) => node.id),
    );
    const coreNodesWithCounts = coreNodes.map((node) => ({
      ...node,
      docsCount: linkCounts[node.id]?.docs ?? 0,
      evidencesCount: linkCounts[node.id]?.evidences ?? 0,
    }));

    const [, trailsQuery, evidencesQuery, docsQuery, nodesCountQuery, evidencesCountQuery, quickQuestions] = await Promise.all([
      ensureQuickStartTrail(universeQuery.data.id, slug),
      client
        .from('trails')
        .select('id, title, summary')
        .eq('universe_id', universeQuery.data.id)
        .order('created_at', { ascending: false })
        .limit(3),
      client
        .from('evidences')
        .select('id, title, summary')
        .eq('universe_id', universeQuery.data.id)
        .eq('curated', true)
        .order('created_at', { ascending: false })
        .limit(3),
      client
        .from('documents')
        .select('id, status, is_deleted')
        .eq('universe_id', universeQuery.data.id)
        .eq('is_deleted', false),
      client.from('nodes').select('id', { count: 'exact', head: true }).eq('universe_id', universeQuery.data.id),
      client.from('evidences').select('id', { count: 'exact', head: true }).eq('universe_id', universeQuery.data.id),
      getQuickQuestions(universeQuery.data.id),
    ]);

    const docsProcessed = (docsQuery.data ?? []).filter((doc) => doc.status === 'processed').length;
    const nodesTotal = Number(nodesCountQuery.count ?? 0);
    const evidencesTotal = Number(evidencesCountQuery.count ?? 0);

    return {
      source: 'db',
      universeId: universeQuery.data.id,
      slug,
      title: universeQuery.data.title,
      summary: universeQuery.data.summary,
      quickStart: {
        docsProcessed,
        nodesTotal,
        evidencesTotal,
        trailSlug: 'comece-aqui',
        questions: quickQuestions.length > 0 ? quickQuestions : mockQuickQuestions(slug),
      },
      coreNodes: coreNodesWithCounts,
      featuredTrails: trailsQuery.data ?? [],
      featuredEvidences: evidencesQuery.data ?? [],
    };
  } catch {
    return {
      source: 'mock',
      universeId: null,
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      quickStart: mockQuickStart,
      coreNodes: mock.coreNodes,
      featuredTrails: mockFeaturedTrails(mock.coreNodes),
      featuredEvidences: mockFeaturedEvidences(mock.coreNodes),
    };
  }
}

export async function getMapData(slug: string): Promise<MapData> {
  const mock = getUniverseMock(slug);
  if (!isSupabaseServerEnvConfigured()) {
    return {
      source: 'mock',
      universeId: null,
      slug,
      title: mock.title,
      nodes: mock.coreNodes.map((node) => ({
        ...node,
        tags: node.tags ?? [node.type],
        summary: node.summary ?? `No mock para ${node.label}.`,
      })),
      edges: buildMockEdges(slug, mock.coreNodes),
    };
  }

  const client = getSupabaseServerClient();
  if (!client) {
    return {
      source: 'mock',
      universeId: null,
      slug,
      title: mock.title,
      nodes: mock.coreNodes.map((node) => ({
        ...node,
        tags: node.tags ?? [node.type],
        summary: node.summary ?? `No mock para ${node.label}.`,
      })),
      edges: buildMockEdges(slug, mock.coreNodes),
    };
  }

  try {
    const universeQuery = await client
      .from('universes')
      .select('id, title')
      .eq('slug', slug)
      .maybeSingle();

    if (universeQuery.error || !universeQuery.data) {
      return {
        source: 'mock',
        universeId: null,
        slug,
        title: mock.title,
        nodes: mock.coreNodes.map((node) => ({
          ...node,
          tags: node.tags ?? [node.type],
          summary: node.summary ?? `No mock para ${node.label}.`,
        })),
        edges: buildMockEdges(slug, mock.coreNodes),
      };
    }

    const [nodesQuery, edgesQuery] = await Promise.all([
      client
        .from('nodes')
        .select('id, slug, title, kind, summary, tags')
        .eq('universe_id', universeQuery.data.id)
        .order('created_at', { ascending: true }),
      client
        .from('edges')
        .select('id, from_node_id, to_node_id, label, weight')
        .eq('universe_id', universeQuery.data.id),
    ]);

    if (nodesQuery.error || edgesQuery.error || !nodesQuery.data?.length) {
      return {
        source: 'mock',
        universeId: null,
        slug,
        title: mock.title,
        nodes: mock.coreNodes.map((node) => ({
          ...node,
          tags: node.tags ?? [node.type],
          summary: node.summary ?? `No mock para ${node.label}.`,
        })),
        edges: buildMockEdges(slug, mock.coreNodes),
      };
    }

    const nodes: UniverseNode[] = nodesQuery.data.map((node) => ({
      id: node.id,
      slug: node.slug,
      label: node.title,
      type: mapNodeKind(node.kind),
      summary: node.summary,
      tags: Array.isArray(node.tags) && node.tags.length > 0 ? node.tags : [mapNodeKind(node.kind)],
    }));

    const edges: MapEdge[] = (edgesQuery.data ?? []).map((edge) => ({
      id: edge.id,
      fromNodeId: edge.from_node_id,
      toNodeId: edge.to_node_id,
      label: edge.label,
      weight: edge.weight,
    }));

    return {
      source: 'db',
      universeId: universeQuery.data.id,
      slug,
      title: universeQuery.data.title,
      nodes,
      edges,
    };
  } catch {
    return {
      source: 'mock',
      universeId: null,
      slug,
      title: mock.title,
      nodes: mock.coreNodes.map((node) => ({
        ...node,
        tags: node.tags ?? [node.type],
        summary: node.summary ?? `No mock para ${node.label}.`,
      })),
      edges: buildMockEdges(slug, mock.coreNodes),
    };
  }
}

export async function getNodeRelatedDocuments(
  universeSlug: string,
  nodeLabels: string[],
): Promise<Record<string, NodeRelatedDocument[]>> {
  const result: Record<string, NodeRelatedDocument[]> = {};
  nodeLabels.forEach((label) => {
    result[label] = [];
  });

  if (!isSupabaseServerEnvConfigured()) return result;
  const client = getSupabaseServerClient();
  if (!client) return result;

  const universe = await client
    .from('universes')
    .select('id')
    .eq('slug', universeSlug)
    .maybeSingle();
  if (universe.error || !universe.data?.id) return result;

  for (const label of nodeLabels) {
    const query = label.trim().replace(/%/g, '');
    if (!query) continue;

    const { data: chunkRefs } = await client
      .from('chunks')
      .select('document_id')
      .eq('universe_id', universe.data.id)
      .eq('archived', false)
      .ilike('text', `%${query}%`)
      .limit(20);

    const docIds = Array.from(
      new Set((chunkRefs ?? []).map((row) => row.document_id).filter(Boolean)),
    );

    if (docIds.length === 0) {
      result[label] = [];
      continue;
    }

    const { data: docsRaw } = await client
      .from('documents')
      .select('id, title, year, status, is_deleted')
      .in('id', docIds)
      .eq('is_deleted', false);

    const docs = (docsRaw ?? []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      year: doc.year,
      status: doc.status as 'uploaded' | 'processed' | 'link_only' | 'error',
    }));

    const unique = new Map<string, NodeRelatedDocument>();
    for (const doc of docs) {
      unique.set(doc.id, doc);
    }
    result[label] = Array.from(unique.values()).slice(0, 4);
  }

  return result;
}
