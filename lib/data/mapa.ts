import 'server-only';
import { getUniverseMock } from '@/lib/mock/universe';
import { listNodeDocumentsByNodeIds, listNodeEvidencesByNodeIds, listNodeQuestionsByNodeIds, type NodeLinkedDocument, type NodeLinkedEvidence, type NodeQuestion } from '@/lib/data/nodeLinks';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { MapFilters } from '@/lib/filters/mapFilters';
import { buildClusters, getClusterDetail, type MapCluster } from '@/lib/map/cluster';

export type MapNodeExplorer = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  summary: string;
  tags: string[];
  isCore: boolean;
  docsLinkedCount: number;
  evidencesLinkedCount: number;
  questionsCount: number;
  coverageScore: number;
};

export type MapEdgeLite = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  weight: number | null;
};

export type MapNodeDetail = {
  node: MapNodeExplorer;
  linkedDocs: NodeLinkedDocument[];
  linkedEvidences: NodeLinkedEvidence[];
  linkedQuestions: NodeQuestion[];
  relatedEdges: MapEdgeLite[];
};

export type MapListResult = {
  source: 'db' | 'mock';
  universeId: string;
  universeTitle: string;
  nodes: MapNodeExplorer[];
  clusters: MapCluster[];
  edges: MapEdgeLite[];
  totalNodes: number;
  nodeCap: number;
  kindOptions: string[];
  tagOptions: string[];
};

export type MapSelectionDetail =
  | {
      kind: 'node';
      node: MapNodeExplorer;
      linkedDocs: NodeLinkedDocument[];
      linkedEvidences: NodeLinkedEvidence[];
      linkedQuestions: NodeQuestion[];
      relatedEdges: MapEdgeLite[];
    }
  | {
      kind: 'cluster';
      cluster: MapCluster;
      nodes: MapNodeExplorer[];
    };

function clip(text: string, max = 140) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function scoreCoverage(input: { docs: number; evidences: number; questions: number }) {
  const doc = Math.min(100, input.docs * 20);
  const ev = Math.min(100, input.evidences * 25);
  const q = Math.min(100, input.questions * 25);
  return Math.round(doc * 0.35 + ev * 0.45 + q * 0.2);
}

function matchCoverage(score: number, filter: MapFilters['coverage']) {
  if (!filter) return true;
  if (filter === 'low') return score < 45;
  if (filter === 'mid') return score >= 45 && score < 75;
  return score >= 75;
}

function mapMock(slug: string, filters: MapFilters): MapListResult {
  const mock = getUniverseMock(slug);
  const nodes = mock.coreNodes.map((node, index) => {
    const docs = 1 + (index % 4);
    const evidences = 1 + (index % 3);
    const questions = index % 3;
    const coverageScore = scoreCoverage({ docs, evidences, questions });
    return {
      id: node.id,
      slug: node.slug ?? node.id,
      title: node.label,
      kind: node.type,
      summary: node.summary ?? `No de ${node.label}.`,
      tags: node.tags ?? [node.type],
      isCore: true,
      docsLinkedCount: docs,
      evidencesLinkedCount: evidences,
      questionsCount: questions,
      coverageScore,
    } satisfies MapNodeExplorer;
  });
  const filtered = nodes.filter((node) => {
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!`${node.title} ${node.summary} ${node.tags.join(' ')}`.toLowerCase().includes(q)) return false;
    }
    if (filters.kind.length > 0 && !filters.kind.includes(node.kind.toLowerCase())) return false;
    if ((filters.core || filters.view === 'core') && !node.isCore) return false;
    if (filters.tags.length > 0) {
      const tags = node.tags.map((tag) => tag.toLowerCase());
      if (!filters.tags.some((tag) => tags.includes(tag))) return false;
    }
    if (!matchCoverage(node.coverageScore, filters.coverage)) return false;
    return true;
  });
  const byCluster =
    filters.cluster && filters.view !== 'all'
      ? getClusterDetail(filters.cluster, filtered)?.nodes ?? []
      : filtered;
  const visible = byCluster.slice(0, 120);
  const clusters = buildClusters(filtered);

  const edges: MapEdgeLite[] = visible.slice(0, -1).map((node, idx) => ({
    id: `${slug}-edge-${idx + 1}`,
    fromNodeId: node.id,
    toNodeId: visible[idx + 1].id,
    label: 'conecta',
    weight: null,
  }));

  return {
    source: 'mock',
    universeId: slug,
    universeTitle: mock.title,
    nodes: visible,
    clusters,
    edges,
    totalNodes: filtered.length,
    nodeCap: 120,
    kindOptions: Array.from(new Set(nodes.map((node) => node.kind))),
    tagOptions: Array.from(new Set(nodes.flatMap((node) => node.tags))).slice(0, 20),
  };
}

export async function listNodesForMap(input: { slug: string; filters: MapFilters; limit?: number }): Promise<MapListResult> {
  const db = getSupabaseServerClient();
  if (!db) return mapMock(input.slug, input.filters);
  const { data: universe } = await db.from('universes').select('id, title').eq('slug', input.slug).maybeSingle();
  if (!universe) return mapMock(input.slug, input.filters);

  const limit = Math.max(1, Math.min(200, input.limit ?? 120));
  const { data: nodesRaw } = await db
    .from('nodes')
    .select('id, slug, title, kind, summary, tags')
    .eq('universe_id', universe.id)
    .order('created_at', { ascending: true })
    .limit(limit);
  const nodesBase = nodesRaw ?? [];
  const nodeIds = nodesBase.map((node) => node.id);

  const [docsByNode, evidencesByNode, questionsByNode] = await Promise.all([
    listNodeDocumentsByNodeIds(universe.id, nodeIds),
    listNodeEvidencesByNodeIds(universe.id, nodeIds),
    listNodeQuestionsByNodeIds(universe.id, nodeIds),
  ]);

  const mapped = nodesBase.map((node) => {
    const docs = docsByNode[node.id]?.length ?? 0;
    const evidences = evidencesByNode[node.id]?.length ?? 0;
    const questions = questionsByNode[node.id]?.length ?? 0;
    const tags = ((node.tags ?? []) as string[]).filter((tag: string) => Boolean(tag));
    const isCore = node.kind === 'core' || tags.includes('core');
    return {
      id: node.id,
      slug: node.slug,
      title: node.title,
      kind: (node.kind ?? 'concept').toLowerCase(),
      summary: clip(node.summary ?? ''),
      tags,
      isCore,
      docsLinkedCount: docs,
      evidencesLinkedCount: evidences,
      questionsCount: questions,
      coverageScore: scoreCoverage({ docs, evidences, questions }),
    } satisfies MapNodeExplorer;
  });

  const filteredBase = mapped.filter((node) => {
    if (input.filters.q) {
      const q = input.filters.q.toLowerCase();
      if (!`${node.title} ${node.summary} ${node.tags.join(' ')}`.toLowerCase().includes(q)) return false;
    }
    if (input.filters.kind.length > 0 && !input.filters.kind.includes(node.kind)) return false;
    if ((input.filters.core || input.filters.view === 'core') && !node.isCore) return false;
    if (input.filters.tags.length > 0) {
      const tags = node.tags.map((tag) => tag.toLowerCase());
      if (!input.filters.tags.some((tag) => tags.includes(tag))) return false;
    }
    if (!matchCoverage(node.coverageScore, input.filters.coverage)) return false;
    return true;
  });
  const clusters = buildClusters(filteredBase);
  const clusterNodes =
    input.filters.cluster && input.filters.view !== 'all'
      ? getClusterDetail(input.filters.cluster, filteredBase)?.nodes ?? []
      : filteredBase;
  const filtered = clusterNodes.slice(0, 120);

  const visibleIds = filtered.map((node) => node.id);
  const { data: edgesRaw } =
    visibleIds.length > 1
      ? await db
          .from('edges')
          .select('id, from_node_id, to_node_id, label, weight')
          .eq('universe_id', universe.id)
          .in('from_node_id', visibleIds)
          .in('to_node_id', visibleIds)
          .limit(300)
      : { data: [] as Array<{ id: string; from_node_id: string; to_node_id: string; label: string; weight: number | null }> };

  const edges = (edgesRaw ?? []).map((edge) => ({
    id: edge.id,
    fromNodeId: edge.from_node_id,
    toNodeId: edge.to_node_id,
    label: edge.label ?? 'conecta',
    weight: edge.weight ?? null,
  }));

  return {
    source: 'db',
    universeId: universe.id,
    universeTitle: universe.title,
    nodes: filtered,
    clusters,
    edges,
    totalNodes: clusterNodes.length,
    nodeCap: 120,
    kindOptions: Array.from(new Set(mapped.map((node) => node.kind))).sort(),
    tagOptions: Array.from(new Set(mapped.flatMap((node) => node.tags))).slice(0, 24),
  };
}

export async function getNodeDetail(input: { slug: string; nodeId?: string; nodeSlug?: string; clusterTag?: string }): Promise<MapSelectionDetail | null> {
  const db = getSupabaseServerClient();
  if (!db) {
    const seeded = mapMock(input.slug, {
      q: '',
      kind: [],
      core: false,
      tags: [],
      coverage: '',
      view: 'all',
      cluster: input.clusterTag ?? '',
      node: input.nodeSlug ?? '',
      selected: input.nodeId ?? '',
      panel: '',
    });
    if (input.clusterTag) {
      const detail = getClusterDetail(input.clusterTag, seeded.nodes);
      if (!detail) return null;
      return {
        kind: 'cluster',
        cluster: detail.cluster,
        nodes: detail.nodes,
      };
    }
    const node = seeded.nodes.find((item) => item.id === input.nodeId || item.slug === input.nodeSlug);
    if (!node) return null;
    return {
      kind: 'node',
      node,
      linkedDocs: [],
      linkedEvidences: [],
      linkedQuestions: [],
      relatedEdges: seeded.edges.filter((edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id),
    };
  }
  const { data: universe } = await db.from('universes').select('id').eq('slug', input.slug).maybeSingle();
  if (!universe) {
    const seeded = mapMock(input.slug, {
      q: '',
      kind: [],
      core: false,
      tags: [],
      coverage: '',
      view: 'all',
      cluster: input.clusterTag ?? '',
      node: input.nodeSlug ?? '',
      selected: input.nodeId ?? '',
      panel: '',
    });
    if (input.clusterTag) {
      const detail = getClusterDetail(input.clusterTag, seeded.nodes);
      if (!detail) return null;
      return {
        kind: 'cluster',
        cluster: detail.cluster,
        nodes: detail.nodes,
      };
    }
    const node = seeded.nodes.find((item) => item.id === input.nodeId || item.slug === input.nodeSlug);
    if (!node) return null;
    return {
      kind: 'node',
      node,
      linkedDocs: [],
      linkedEvidences: [],
      linkedQuestions: [],
      relatedEdges: seeded.edges.filter((edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id),
    };
  }

  if (input.clusterTag) {
    const { data: nodesRaw } = await db
      .from('nodes')
      .select('id, slug, title, kind, summary, tags')
      .eq('universe_id', universe.id)
      .order('created_at', { ascending: true })
      .limit(180);
    const nodesBase = nodesRaw ?? [];
    const nodeIds = nodesBase.map((node) => node.id);
    const [docsByNode, evidencesByNode, questionsByNode] = await Promise.all([
      listNodeDocumentsByNodeIds(universe.id, nodeIds),
      listNodeEvidencesByNodeIds(universe.id, nodeIds),
      listNodeQuestionsByNodeIds(universe.id, nodeIds),
    ]);
    const nodes: MapNodeExplorer[] = nodesBase.map((node) => {
      const docs = docsByNode[node.id]?.length ?? 0;
      const evidences = evidencesByNode[node.id]?.length ?? 0;
      const questions = questionsByNode[node.id]?.length ?? 0;
      const tags = ((node.tags ?? []) as string[]).filter((tag: string) => Boolean(tag));
      const isCore = node.kind === 'core' || tags.includes('core');
      return {
        id: node.id,
        slug: node.slug,
        title: node.title,
        kind: (node.kind ?? 'concept').toLowerCase(),
        summary: clip(node.summary ?? ''),
        tags,
        isCore,
        docsLinkedCount: docs,
        evidencesLinkedCount: evidences,
        questionsCount: questions,
        coverageScore: scoreCoverage({ docs, evidences, questions }),
      };
    });
    const detail = getClusterDetail(input.clusterTag, nodes);
    if (!detail) return null;
    return {
      kind: 'cluster',
      cluster: detail.cluster,
      nodes: detail.nodes,
    };
  }

  let query = db
    .from('nodes')
    .select('id, slug, title, kind, summary, tags')
    .eq('universe_id', universe.id);
  if (input.nodeId) query = query.eq('id', input.nodeId);
  if (!input.nodeId && input.nodeSlug) query = query.eq('slug', input.nodeSlug);
  const { data: nodeRaw } = await query.maybeSingle();
  if (!nodeRaw) return null;

  const [docsByNode, evidencesByNode, questionsByNode] = await Promise.all([
    listNodeDocumentsByNodeIds(universe.id, [nodeRaw.id]),
    listNodeEvidencesByNodeIds(universe.id, [nodeRaw.id]),
    listNodeQuestionsByNodeIds(universe.id, [nodeRaw.id]),
  ]);
  const linkedDocs = (docsByNode[nodeRaw.id] ?? []).slice(0, 6);
  const linkedEvidences = (evidencesByNode[nodeRaw.id] ?? []).slice(0, 6);
  const linkedQuestions = (questionsByNode[nodeRaw.id] ?? []).slice(0, 6);

  const { data: relatedEdgesRaw } = await db
    .from('edges')
    .select('id, from_node_id, to_node_id, label, weight')
    .eq('universe_id', universe.id)
    .or(`from_node_id.eq.${nodeRaw.id},to_node_id.eq.${nodeRaw.id}`)
    .limit(20);
  const relatedEdges = (relatedEdgesRaw ?? []).map((edge) => ({
    id: edge.id,
    fromNodeId: edge.from_node_id,
    toNodeId: edge.to_node_id,
    label: edge.label ?? 'conecta',
    weight: edge.weight ?? null,
  }));

  const tags = (nodeRaw.tags ?? []).filter(Boolean);
  const isCore = nodeRaw.kind === 'core' || tags.includes('core');
  const node: MapNodeExplorer = {
    id: nodeRaw.id,
    slug: nodeRaw.slug,
    title: nodeRaw.title,
    kind: (nodeRaw.kind ?? 'concept').toLowerCase(),
    summary: clip(nodeRaw.summary ?? '', 180),
    tags,
    isCore,
    docsLinkedCount: linkedDocs.length,
    evidencesLinkedCount: linkedEvidences.length,
    questionsCount: linkedQuestions.length,
    coverageScore: scoreCoverage({
      docs: linkedDocs.length,
      evidences: linkedEvidences.length,
      questions: linkedQuestions.length,
    }),
  };

  return {
    kind: 'node',
    node,
    linkedDocs,
    linkedEvidences,
    linkedQuestions,
    relatedEdges,
  };
}
