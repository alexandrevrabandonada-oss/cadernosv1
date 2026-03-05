import type { NoteSourceType } from '@/lib/notes/types';

export type CadernoFilters = {
  kind: 'all' | 'highlight' | 'note';
  sourceType: 'all' | NoteSourceType;
  tags: string[];
  q: string;
  selected: string;
  panel: '' | 'detail' | 'filters';
};

function readString(source: Record<string, string | string[] | undefined>, key: string) {
  const value = source[key];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function parseKind(value: string): CadernoFilters['kind'] {
  if (value === 'highlight' || value === 'note') return value;
  return 'all';
}

function parseSourceType(value: string): CadernoFilters['sourceType'] {
  const valid: Array<CadernoFilters['sourceType']> = ['all', 'evidence', 'thread', 'citation', 'chunk', 'doc', 'event', 'term', 'node'];
  return valid.includes(value as CadernoFilters['sourceType']) ? (value as CadernoFilters['sourceType']) : 'all';
}

export function parseCadernoFilters(searchParams: Record<string, string | string[] | undefined>): CadernoFilters {
  const kind = parseKind(readString(searchParams, 'kind'));
  const sourceType = parseSourceType(readString(searchParams, 'sourceType'));
  const tags = readString(searchParams, 'tags')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
  const q = readString(searchParams, 'q').trim().slice(0, 200);
  const selected = readString(searchParams, 'selected').trim();
  const panelRaw = readString(searchParams, 'panel');
  const panel: CadernoFilters['panel'] = panelRaw === 'detail' || panelRaw === 'filters' ? panelRaw : '';
  return { kind, sourceType, tags, q, selected, panel };
}

export function serializeCadernoFilters(filters: CadernoFilters) {
  const qs = new URLSearchParams();
  if (filters.kind !== 'all') qs.set('kind', filters.kind);
  if (filters.sourceType !== 'all') qs.set('sourceType', filters.sourceType);
  if (filters.tags.length > 0) qs.set('tags', filters.tags.join(','));
  if (filters.q) qs.set('q', filters.q);
  if (filters.selected) qs.set('selected', filters.selected);
  if (filters.panel) qs.set('panel', filters.panel);
  return qs.toString();
}
