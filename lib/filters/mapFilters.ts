import 'server-only';

export type MapCoverage = '' | 'low' | 'mid' | 'high';
export type MapView = 'core' | 'clusters' | 'all';

export type MapFilters = {
  q: string;
  kind: string[];
  core: boolean;
  tags: string[];
  coverage: MapCoverage;
  view: MapView;
  cluster: string;
  node: string;
  selected: string;
  panel: '' | 'detail' | 'filters';
};

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : (value ?? '');
}

export function parseMapFilters(searchParams: Record<string, string | string[] | undefined>): MapFilters {
  const kindRaw = searchParams.kind;
  const kindValues = Array.isArray(kindRaw) ? kindRaw.flatMap((k) => k.split(',')) : readFirst(kindRaw).split(',');
  const tags = readFirst(searchParams.tags)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const panelRaw = readFirst(searchParams.panel);
  const panel: '' | 'detail' | 'filters' = panelRaw === 'detail' || panelRaw === 'filters' ? panelRaw : '';
  const coverageRaw = readFirst(searchParams.coverage).trim().toLowerCase();
  const coverage: MapCoverage = coverageRaw === 'low' || coverageRaw === 'mid' || coverageRaw === 'high' ? coverageRaw : '';
  const viewRaw = readFirst(searchParams.view).trim().toLowerCase();
  const view: MapView =
    viewRaw === 'all' ? 'all' : viewRaw === 'clusters' || viewRaw === 'cluster' ? 'clusters' : 'core';

  return {
    q: readFirst(searchParams.q).trim(),
    kind: Array.from(new Set(kindValues.map((item) => item.trim().toLowerCase()).filter(Boolean))),
    core: readFirst(searchParams.core) === '1',
    tags,
    coverage,
    view,
    cluster: readFirst(searchParams.cluster).trim().toLowerCase(),
    node: readFirst(searchParams.node).trim(),
    selected: readFirst(searchParams.selected).trim(),
    panel,
  };
}

export function serializeMapFilters(filters: Partial<MapFilters>) {
  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.kind && filters.kind.length > 0) qs.set('kind', filters.kind.join(','));
  if (filters.core) qs.set('core', '1');
  if (filters.tags && filters.tags.length > 0) qs.set('tags', filters.tags.join(','));
  if (filters.coverage) qs.set('coverage', filters.coverage);
  if (filters.view && filters.view !== 'core') qs.set('view', filters.view);
  if (filters.cluster) qs.set('cluster', filters.cluster);
  if (filters.node) qs.set('node', filters.node);
  if (filters.selected) qs.set('selected', filters.selected);
  if (filters.panel) qs.set('panel', filters.panel);
  return qs.toString();
}
