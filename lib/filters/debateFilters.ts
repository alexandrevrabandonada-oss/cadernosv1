import 'server-only';

export type DebateLens = 'default' | 'worker' | 'resident' | 'researcher' | 'policy';
export type DebateKind = 'all' | 'default' | 'guided' | 'tutor_chat';
export type DebateStatus = 'all' | 'strict_ok' | 'insufficient';
export type DebateConfidence = 'all' | 'forte' | 'media' | 'fraca';

export type DebateFilters = {
  lens: DebateLens;
  node: string;
  kind: DebateKind;
  status: DebateStatus;
  confidence: DebateConfidence;
  q: string;
  yearFrom: number | null;
  yearTo: number | null;
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

function parseLens(value: string): DebateLens {
  if (value === 'worker' || value === 'resident' || value === 'researcher' || value === 'policy') return value;
  return 'default';
}

function parseKind(value: string): DebateKind {
  if (value === 'default' || value === 'guided' || value === 'tutor_chat') return value;
  return 'all';
}

function parseStatus(value: string): DebateStatus {
  if (value === 'strict_ok' || value === 'insufficient') return value;
  return 'all';
}

function parseConfidence(value: string): DebateConfidence {
  if (value === 'forte' || value === 'media' || value === 'fraca') return value;
  return 'all';
}

export function parseDebateFilters(searchParams: Record<string, string | string[] | undefined>): DebateFilters {
  const panelRaw = readFirst(searchParams.panel);
  const panel: '' | 'detail' | 'filters' = panelRaw === 'detail' || panelRaw === 'filters' ? panelRaw : '';
  return {
    lens: parseLens(readFirst(searchParams.lens)),
    node: readFirst(searchParams.node).trim(),
    kind: parseKind(readFirst(searchParams.kind)),
    status: parseStatus(readFirst(searchParams.status)),
    confidence: parseConfidence(readFirst(searchParams.confidence)),
    q: readFirst(searchParams.q).trim(),
    yearFrom: parseNumber(readFirst(searchParams.yearFrom)),
    yearTo: parseNumber(readFirst(searchParams.yearTo)),
    selected: readFirst(searchParams.selected).trim(),
    panel,
    cursor: Math.max(0, parseNumber(readFirst(searchParams.cursor)) ?? 0),
  };
}

export function serializeDebateFilters(filters: Partial<DebateFilters>) {
  const qs = new URLSearchParams();
  if (filters.lens && filters.lens !== 'default') qs.set('lens', filters.lens);
  if (filters.node) qs.set('node', filters.node);
  if (filters.kind && filters.kind !== 'all') qs.set('kind', filters.kind);
  if (filters.status && filters.status !== 'all') qs.set('status', filters.status);
  if (filters.confidence && filters.confidence !== 'all') qs.set('confidence', filters.confidence);
  if (filters.q) qs.set('q', filters.q);
  if (typeof filters.yearFrom === 'number') qs.set('yearFrom', String(filters.yearFrom));
  if (typeof filters.yearTo === 'number') qs.set('yearTo', String(filters.yearTo));
  if (filters.selected) qs.set('selected', filters.selected);
  if (filters.panel) qs.set('panel', filters.panel);
  if (typeof filters.cursor === 'number' && filters.cursor > 0) qs.set('cursor', String(filters.cursor));
  return qs.toString();
}
