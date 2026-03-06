import { buildUniverseHref } from '@/lib/universeNav';
import type { SharedNotebookItem } from '@/lib/shared-notebooks/types';

export function buildSharedNotebookItemHref(slug: string, item: Pick<SharedNotebookItem, 'id' | 'sourceType' | 'sourceId' | 'sourceMeta'>) {
  const meta = item.sourceMeta ?? {};
  const originalSourceType = typeof meta.originalSourceType === 'string' ? meta.originalSourceType : item.sourceType;
  const originalSourceId = typeof meta.originalSourceId === 'string' ? meta.originalSourceId : item.sourceId ?? null;
  if (originalSourceType === 'evidence' && originalSourceId) return `${buildUniverseHref(slug, 'provas')}?selected=${originalSourceId}&panel=detail`;
  if (originalSourceType === 'thread' && originalSourceId) return `${buildUniverseHref(slug, 'debate')}?selected=${originalSourceId}&panel=detail`;
  if (originalSourceType === 'event' && originalSourceId) return `${buildUniverseHref(slug, 'linha')}?selected=${originalSourceId}&panel=detail`;
  if (originalSourceType === 'term' && originalSourceId) return `${buildUniverseHref(slug, 'glossario')}?selected=${originalSourceId}&panel=detail`;
  if (originalSourceType === 'node') {
    const nodeSlug = typeof meta.nodeSlug === 'string' ? meta.nodeSlug : originalSourceId ?? '';
    if (nodeSlug) return `${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(nodeSlug)}&panel=detail`;
  }
  if (originalSourceType === 'citation' || originalSourceType === 'chunk' || originalSourceType === 'doc' || originalSourceType === 'highlight' || originalSourceType === 'note') {
    const docId = typeof meta.docId === 'string' ? meta.docId : typeof meta.originalDocId === 'string' ? meta.originalDocId : '';
    const pageStart = typeof meta.pageStart === 'number' ? meta.pageStart : null;
    const hl = typeof meta.originalHighlightId === 'string' ? meta.originalHighlightId : item.sourceType === 'highlight' ? item.sourceId ?? '' : '';
    if (docId) {
      const qs = new URLSearchParams();
      if (pageStart) qs.set('p', String(pageStart));
      if (hl) qs.set('hl', hl);
      return `${buildUniverseHref(slug, `doc/${docId}`)}${qs.toString() ? `?${qs.toString()}` : ''}`;
    }
  }
  return buildUniverseHref(slug, 'coletivos');
}
