import { SEARCH_TYPES, type SearchType } from '@/lib/search/types';

export type ParsedSearchQuery = {
  raw: string;
  text: string;
  normalizedText: string;
  tags: string[];
  notesOnly: boolean;
};

function uniq(values: string[]) {
  return Array.from(new Set(values));
}

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim();
  const notesOnly = trimmed.startsWith('@');
  const withoutAt = notesOnly ? trimmed.slice(1).trim() : trimmed;
  const tags = uniq(Array.from(withoutAt.matchAll(/#([^\s#]+)/g)).map((match) => match[1].toLowerCase())).slice(0, 8);
  const text = withoutAt.replace(/#([^\s#]+)/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    raw,
    text,
    normalizedText: text.toLowerCase(),
    tags,
    notesOnly,
  };
}

export function parseSearchTypes(raw: string | null | undefined): SearchType[] {
  if (!raw) return [...SEARCH_TYPES];
  const requested = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is SearchType => SEARCH_TYPES.includes(item as SearchType));
  return requested.length > 0 ? uniq(requested) as SearchType[] : [...SEARCH_TYPES];
}
