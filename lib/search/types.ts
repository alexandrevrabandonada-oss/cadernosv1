export const SEARCH_TYPES = ['node', 'term', 'doc', 'evidence', 'event', 'thread', 'note'] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export type SearchResult = {
  type: SearchType;
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  href: string;
  badges?: string[];
  tags?: string[];
  score?: number;
};

export type SearchResponse = {
  results: SearchResult[];
  meta: {
    countsByType: Partial<Record<SearchType, number>>;
  };
};
