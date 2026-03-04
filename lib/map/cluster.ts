import 'server-only';

import type { MapNodeExplorer } from '@/lib/data/mapa';

export type MapCluster = {
  id: string;
  tag: string;
  label: string;
  count: number;
  topNodes: Array<Pick<MapNodeExplorer, 'id' | 'slug' | 'title' | 'coverageScore'>>;
  tags: string[];
  docsTotal: number;
  evidencesTotal: number;
  questionsTotal: number;
};

export type MapClusterDetail = {
  cluster: MapCluster;
  nodes: MapNodeExplorer[];
};

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function byScore(a: MapNodeExplorer, b: MapNodeExplorer) {
  if (a.evidencesLinkedCount !== b.evidencesLinkedCount) return b.evidencesLinkedCount - a.evidencesLinkedCount;
  if (a.coverageScore !== b.coverageScore) return b.coverageScore - a.coverageScore;
  return a.title.localeCompare(b.title);
}

function makeCluster(tag: string, label: string, nodes: MapNodeExplorer[]): MapCluster {
  const sorted = [...nodes].sort(byScore);
  return {
    id: `cluster:${tag}`,
    tag,
    label,
    count: nodes.length,
    topNodes: sorted.slice(0, 3).map((node) => ({
      id: node.id,
      slug: node.slug,
      title: node.title,
      coverageScore: node.coverageScore,
    })),
    tags: Array.from(new Set(nodes.flatMap((node) => node.tags))).slice(0, 6),
    docsTotal: nodes.reduce((acc, node) => acc + node.docsLinkedCount, 0),
    evidencesTotal: nodes.reduce((acc, node) => acc + node.evidencesLinkedCount, 0),
    questionsTotal: nodes.reduce((acc, node) => acc + node.questionsCount, 0),
  };
}

export function buildClusters(nodes: MapNodeExplorer[]): MapCluster[] {
  if (nodes.length === 0) return [];

  const byKind = new Map<string, MapNodeExplorer[]>();
  for (const node of nodes) {
    const key = slugify(node.kind || 'geral');
    if (!byKind.has(key)) byKind.set(key, []);
    byKind.get(key)!.push(node);
  }

  const kindClusters = Array.from(byKind.entries())
    .filter(([, items]) => items.length >= 2)
    .map(([tag, items]) => makeCluster(tag, items[0]?.kind.toUpperCase() ?? tag.toUpperCase(), items));

  if (kindClusters.length >= 3) {
    return kindClusters.sort((a, b) => b.count - a.count).slice(0, 12);
  }

  const tagFreq = new Map<string, number>();
  for (const node of nodes) {
    for (const tag of node.tags) {
      const key = slugify(tag);
      if (!key) continue;
      tagFreq.set(key, (tagFreq.get(key) ?? 0) + 1);
    }
  }

  const topTags = Array.from(tagFreq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag]) => tag);

  const clusters: MapCluster[] = [];
  for (const tag of topTags) {
    const members = nodes.filter((node) => node.tags.some((item) => slugify(item) === tag));
    if (members.length < 2) continue;
    const label = members.find((node) => node.tags.length > 0)?.tags.find((item) => slugify(item) === tag) ?? tag.toUpperCase();
    clusters.push(makeCluster(tag, label, members));
  }

  if (clusters.length > 0) return clusters.sort((a, b) => b.count - a.count).slice(0, 12);

  return [makeCluster('geral', 'GERAL', nodes)];
}

export function getClusterDetail(clusterTag: string, nodes: MapNodeExplorer[]): MapClusterDetail | null {
  const tag = slugify(clusterTag.replace(/^cluster:/, ''));
  if (!tag) return null;
  const clusters = buildClusters(nodes);
  const selected = clusters.find((cluster) => cluster.tag === tag || cluster.id === `cluster:${tag}`);
  if (!selected) return null;
  const members = nodes
    .filter((node) => {
      if (selected.label.toLowerCase() === node.kind.toLowerCase()) return true;
      return node.tags.some((item) => slugify(item) === selected.tag);
    })
    .sort(byScore)
    .slice(0, 60);
  return {
    cluster: selected,
    nodes: members,
  };
}
