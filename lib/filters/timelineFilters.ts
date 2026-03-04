import 'server-only';

export type TimelineFilters = {
  kind: string[];
  yearFrom: number | null;
  yearTo: number | null;
  node: string;
  tags: string[];
  q: string;
  selected: string;
  panel: '' | 'detail' | 'filters';
  cursor: number;
};

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : (value ?? '');
}

function parseNumber(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTimelineFilters(searchParams: Record<string, string | string[] | undefined>): TimelineFilters {
  const kindRaw = searchParams.kind;
  const kind = Array.isArray(kindRaw)
    ? kindRaw.flatMap((item) => item.split(','))
    : readFirst(kindRaw).split(',');
  const tagRaw = searchParams.tag;
  const tagsFromMulti = Array.isArray(tagRaw)
    ? tagRaw
    : readFirst(tagRaw)
        .split(',')
        .filter(Boolean);
  const tagsFromCsv = readFirst(searchParams.tags)
    .split(',')
    .filter(Boolean);
  const tags = Array.from(
    new Set(
      [...tagsFromMulti, ...tagsFromCsv]
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const panelRaw = readFirst(searchParams.panel);
  const panel: '' | 'detail' | 'filters' = panelRaw === 'detail' || panelRaw === 'filters' ? panelRaw : '';

  return {
    kind: Array.from(new Set(kind.map((item) => item.trim().toLowerCase()).filter(Boolean))),
    yearFrom: parseNumber(readFirst(searchParams.yearFrom)),
    yearTo: parseNumber(readFirst(searchParams.yearTo)),
    node: readFirst(searchParams.node).trim(),
    tags,
    q: readFirst(searchParams.q).trim(),
    selected: readFirst(searchParams.selected).trim(),
    panel,
    cursor: Math.max(0, parseNumber(readFirst(searchParams.cursor)) ?? 0),
  };
}

export function serializeTimelineFilters(filters: Partial<TimelineFilters>) {
  const qs = new URLSearchParams();
  if (filters.kind && filters.kind.length > 0) qs.set('kind', filters.kind.join(','));
  if (typeof filters.yearFrom === 'number') qs.set('yearFrom', String(filters.yearFrom));
  if (typeof filters.yearTo === 'number') qs.set('yearTo', String(filters.yearTo));
  if (filters.node) qs.set('node', filters.node);
  if (filters.tags && filters.tags.length > 0) qs.set('tags', filters.tags.join(','));
  if (filters.q) qs.set('q', filters.q);
  if (filters.selected) qs.set('selected', filters.selected);
  if (filters.panel) qs.set('panel', filters.panel);
  if (typeof filters.cursor === 'number' && filters.cursor > 0) qs.set('cursor', String(filters.cursor));
  return qs.toString();
}
