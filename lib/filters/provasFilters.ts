import 'server-only';

export type ProvasFilters = {
  type: 'evidence' | 'chunk';
  editorial: 'published' | 'review' | 'draft' | 'rejected' | 'all';
  yearFrom: number | null;
  yearTo: number | null;
  tags: string[];
  node: string;
  q: string;
  relatedTo: string;
  selected: string;
  panel: '' | 'detail' | 'filters';
  cursor: number;
};

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseProvasFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ProvasFilters {
  const read = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] ?? '' : (value ?? '');
  };
  const type = read('type') === 'chunk' ? 'chunk' : 'evidence';
  const editorialRaw = read('editorial');
  const editorial: ProvasFilters['editorial'] =
    editorialRaw === 'review' || editorialRaw === 'draft' || editorialRaw === 'rejected' || editorialRaw === 'all'
      ? editorialRaw
      : 'published';
  const tags = read('tags')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const panelRaw = read('panel');
  const panel: '' | 'detail' | 'filters' = panelRaw === 'detail' || panelRaw === 'filters' ? panelRaw : '';

  return {
    type,
    editorial,
    yearFrom: parseNumber(read('yearFrom')),
    yearTo: parseNumber(read('yearTo')),
    tags,
    node: read('node').trim(),
    q: read('q').trim(),
    relatedTo: read('relatedTo').trim(),
    selected: read('selected').trim(),
    panel,
    cursor: Math.max(0, parseNumber(read('cursor')) ?? 0),
  };
}

export function serializeProvasFilters(filters: Partial<ProvasFilters>) {
  const qs = new URLSearchParams();
  if (filters.type && filters.type !== 'evidence') qs.set('type', filters.type);
  if (filters.editorial && filters.editorial !== 'published') qs.set('editorial', filters.editorial);
  if (typeof filters.yearFrom === 'number') qs.set('yearFrom', String(filters.yearFrom));
  if (typeof filters.yearTo === 'number') qs.set('yearTo', String(filters.yearTo));
  if (filters.tags && filters.tags.length > 0) qs.set('tags', filters.tags.join(','));
  if (filters.node) qs.set('node', filters.node);
  if (filters.q) qs.set('q', filters.q);
  if (filters.relatedTo) qs.set('relatedTo', filters.relatedTo);
  if (filters.selected) qs.set('selected', filters.selected);
  if (filters.panel) qs.set('panel', filters.panel);
  if (typeof filters.cursor === 'number' && filters.cursor > 0) qs.set('cursor', String(filters.cursor));
  return qs.toString();
}
