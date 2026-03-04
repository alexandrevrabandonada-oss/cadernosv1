import 'server-only';

export type GlossarioFilters = {
  q: string;
  letter: string;
  tags: string[];
  selected: string;
  panel: '' | 'detail' | 'filters';
  cursor: number;
};

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : (value ?? '');
}

function parseNumber(value: string) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function parseGlossarioFilters(searchParams: Record<string, string | string[] | undefined>): GlossarioFilters {
  const tags = readFirst(searchParams.tags)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const panelRaw = readFirst(searchParams.panel);
  const panel: '' | 'detail' | 'filters' = panelRaw === 'detail' || panelRaw === 'filters' ? panelRaw : '';
  const letterRaw = readFirst(searchParams.letter).trim().toUpperCase();
  return {
    q: readFirst(searchParams.q).trim(),
    letter: /^[A-Z]$/.test(letterRaw) ? letterRaw : '',
    tags,
    selected: readFirst(searchParams.selected).trim(),
    panel,
    cursor: parseNumber(readFirst(searchParams.cursor)),
  };
}

export function serializeGlossarioFilters(filters: Partial<GlossarioFilters>) {
  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.letter) qs.set('letter', filters.letter);
  if (filters.tags && filters.tags.length > 0) qs.set('tags', filters.tags.join(','));
  if (filters.selected) qs.set('selected', filters.selected);
  if (filters.panel) qs.set('panel', filters.panel);
  if (typeof filters.cursor === 'number' && filters.cursor > 0) qs.set('cursor', String(filters.cursor));
  return qs.toString();
}
