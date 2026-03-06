import { type ParsedSearchQuery } from '@/lib/search/query';
import { type SearchResult, type SearchType } from '@/lib/search/types';

type RankOptions = {
  parsed: ParsedSearchQuery;
  totalLimit?: number;
  perTypeLimit?: number;
};

function scoreTextMatch(value: string | undefined, query: string, weight: number) {
  if (!value || !query) return 0;
  const normalized = value.toLowerCase();
  if (normalized === query) return weight * 4;
  if (normalized.startsWith(query)) return weight * 3;
  if (normalized.includes(query)) return weight * 1.5;
  return 0;
}

function typeBoost(type: SearchType) {
  switch (type) {
    case 'node':
      return 4;
    case 'term':
      return 3;
    case 'evidence':
      return 2.5;
    case 'note':
      return 2;
    default:
      return 1;
  }
}

function badgeBoost(badges: string[] | undefined) {
  if (!badges || badges.length === 0) return 0;
  let score = 0;
  for (const badge of badges) {
    const normalized = badge.toLowerCase();
    if (normalized.includes('core')) score += 4;
    if (normalized.includes('publicada') || normalized.includes('published')) score += 2;
    if (normalized.includes('local')) score += 2;
  }
  return score;
}

export function scoreSearchResult(result: SearchResult, parsed: ParsedSearchQuery) {
  let score = typeBoost(result.type);
  score += scoreTextMatch(result.title, parsed.normalizedText, 12);
  score += scoreTextMatch(result.subtitle, parsed.normalizedText, 6);
  score += scoreTextMatch(result.snippet, parsed.normalizedText, 4);
  score += badgeBoost(result.badges);

  if (parsed.tags.length > 0 && result.tags?.length) {
    const tags = result.tags.map((tag) => tag.toLowerCase());
    score += parsed.tags.filter((tag) => tags.includes(tag)).length * 5;
  }

  if (parsed.notesOnly && result.type === 'note') score += 14;
  if (result.type === 'evidence' && result.badges?.some((badge) => badge.toLowerCase().includes('publicada'))) score += 2;
  return score;
}

export function rankSearchResults(results: SearchResult[], options: RankOptions) {
  const totalLimit = Math.max(1, Math.min(40, options.totalLimit ?? 20));
  const perTypeLimit = Math.max(1, Math.min(10, options.perTypeLimit ?? 6));

  const scored = results
    .map((result) => ({ ...result, score: scoreSearchResult(result, options.parsed) }))
    .sort((a, b) => {
      if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.title.localeCompare(b.title, 'pt-BR');
    });

  const counts = new Map<SearchType, number>();
  const output: SearchResult[] = [];
  for (const item of scored) {
    const current = counts.get(item.type) ?? 0;
    if (current >= perTypeLimit) continue;
    counts.set(item.type, current + 1);
    output.push(item);
    if (output.length >= totalLimit) break;
  }
  return output;
}
