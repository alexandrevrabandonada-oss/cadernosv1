import type { StudySession } from '@/lib/study/types';

export type StudyRecommendationNode = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  tags?: string[];
};

export type StudyRecommendationEvidence = {
  id: string;
  title: string;
  summary?: string | null;
  href: string;
  nodeSlug?: string | null;
  tags?: string[];
};

type RecommendInput = {
  sessions: StudySession[];
  nodes: StudyRecommendationNode[];
  evidences: StudyRecommendationEvidence[];
};

function scoreSignals(sessions: StudySession[]) {
  const nodeScores = new Map<string, number>();
  const tagScores = new Map<string, number>();
  for (const session of sessions) {
    for (const item of session.items) {
      if (item.nodeSlug) nodeScores.set(item.nodeSlug, (nodeScores.get(item.nodeSlug) ?? 0) + item.count * 3);
      for (const tag of item.tags ?? []) tagScores.set(tag, (tagScores.get(tag) ?? 0) + item.count);
    }
    if (session.lastSection) tagScores.set(session.lastSection, (tagScores.get(session.lastSection) ?? 0) + 1);
  }
  return { nodeScores, tagScores };
}

export function recommendStudyNext(input: RecommendInput) {
  const { nodeScores, tagScores } = scoreSignals(input.sessions);

  const rankedNodes = input.nodes
    .map((node) => ({
      node,
      score: (nodeScores.get(node.slug) ?? 0) + (node.tags ?? []).reduce((sum, tag) => sum + (tagScores.get(tag) ?? 0), 0),
    }))
    .sort((a, b) => (b.score - a.score) || a.node.title.localeCompare(b.node.title));

  const nodes = rankedNodes.slice(0, 2).map((entry) => entry.node);
  const chosenNodeSlugs = new Set(nodes.map((item) => item.slug));

  const evidences = input.evidences
    .map((evidence) => {
      const tagScore = (evidence.tags ?? []).reduce((sum, tag) => sum + (tagScores.get(tag) ?? 0), 0);
      const nodeScore = evidence.nodeSlug ? (nodeScores.get(evidence.nodeSlug) ?? 0) : 0;
      const selectedBoost = evidence.nodeSlug && chosenNodeSlugs.has(evidence.nodeSlug) ? 4 : 0;
      return { evidence, score: tagScore + nodeScore + selectedBoost };
    })
    .sort((a, b) => (b.score - a.score) || a.evidence.title.localeCompare(b.evidence.title))
    .filter((entry, index, list) => list.findIndex((item) => item.evidence.id === entry.evidence.id) === index)
    .slice(0, 3)
    .map((entry) => entry.evidence);

  return { nodes, evidences };
}
