import { getUniverseMock, type UniverseNode } from '@/lib/mock/universe';
import { getSupabaseServerClient, isSupabaseServerEnvConfigured } from '@/lib/supabase/server';

export type HubData = {
  source: 'db' | 'mock';
  slug: string;
  title: string;
  summary: string;
  coreNodes: UniverseNode[];
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
  slug: string;
  title: string;
  nodes: UniverseNode[];
  edges: MapEdge[];
};

export type NodeRelatedDocument = {
  id: string;
  title: string;
  year: number | null;
  status: 'uploaded' | 'processed';
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

export async function getHubData(slug: string): Promise<HubData> {
  const mock = getUniverseMock(slug);
  if (!isSupabaseServerEnvConfigured()) {
    return {
      source: 'mock',
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      coreNodes: mock.coreNodes,
    };
  }

  const client = getSupabaseServerClient();
  if (!client) {
    return {
      source: 'mock',
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      coreNodes: mock.coreNodes,
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
        slug: mock.slug,
        title: mock.title,
        summary: mock.summary,
        coreNodes: mock.coreNodes,
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
        slug,
        title: universeQuery.data.title,
        summary: universeQuery.data.summary,
        coreNodes: mock.coreNodes.slice(0, 5),
      };
    }

    const coreNodes: UniverseNode[] = nodesQuery.data.map((node) => ({
      id: node.id,
      label: node.title,
      type: mapNodeKind(node.kind),
    }));

    return {
      source: 'db',
      slug,
      title: universeQuery.data.title,
      summary: universeQuery.data.summary,
      coreNodes,
    };
  } catch {
    return {
      source: 'mock',
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      coreNodes: mock.coreNodes,
    };
  }
}

export async function getMapData(slug: string): Promise<MapData> {
  const mock = getUniverseMock(slug);
  if (!isSupabaseServerEnvConfigured()) {
    return {
      source: 'mock',
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
      slug,
      title: universeQuery.data.title,
      nodes,
      edges,
    };
  } catch {
    return {
      source: 'mock',
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
      status: doc.status as 'uploaded' | 'processed',
    }));

    const unique = new Map<string, NodeRelatedDocument>();
    for (const doc of docs) {
      unique.set(doc.id, doc);
    }
    result[label] = Array.from(unique.values()).slice(0, 4);
  }

  return result;
}
