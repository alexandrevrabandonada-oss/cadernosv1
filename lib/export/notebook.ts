export const NOTEBOOK_ITEM_CHAR_LIMIT = 1200;
export const NOTEBOOK_MAX_ITEMS = 40;
export const NOTEBOOK_TAG_INDEX_LIMIT = 10;

export type NotebookItemKind = 'highlight' | 'note';
export type NotebookSourceType = 'evidence' | 'thread' | 'citation' | 'chunk' | 'doc' | 'event' | 'term' | 'node';

export type NotebookSource = {
  type: NotebookSourceType;
  id: string | null;
  meta: Record<string, unknown>;
};

export type NotebookExportItem = {
  kind: NotebookItemKind;
  title: string | null;
  text: string;
  tags: string[];
  source: NotebookSource;
  linkToApp: string;
  createdAt?: string | null;
};

export type NotebookExportStats = {
  totalItems: number;
  includedItems: number;
  omittedItems: number;
  highlightCount: number;
  noteCount: number;
  topTags: Array<{ tag: string; count: number }>;
  sourceDocs: Array<{ title: string; year: number | null; pages: string[] }>;
  kinds: NotebookItemKind[];
};

export type PreparedNotebookExport = {
  items: NotebookExportItem[];
  stats: NotebookExportStats;
};

export type RenderNotebookInput = {
  universe: string;
  title: string;
  actorLabel: string;
  items: NotebookExportItem[];
  stats: NotebookExportStats;
  generatedAt: string;
  includeTagIndex?: boolean;
};

function cleanText(value: string, max: number) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map((item) => cleanText(item, 48).toLowerCase()).filter(Boolean))).slice(0, 12);
}

function pageLabel(start: number | null, end: number | null) {
  if (!start && !end) return 's/p';
  if (start && end && start !== end) return `p.${start}-${end}`;
  return `p.${start ?? end}`;
}

function sourceLabel(item: NotebookExportItem) {
  const meta = item.source.meta ?? {};
  const docTitle = cleanText(typeof meta.docTitle === 'string' ? meta.docTitle : typeof meta.title === 'string' ? meta.title : '', 140);
  const year = typeof meta.year === 'number' ? meta.year : null;
  const pageStart = typeof meta.pageStart === 'number' ? meta.pageStart : null;
  const pageEnd = typeof meta.pageEnd === 'number' ? meta.pageEnd : null;
  const sourceTitle = cleanText(typeof meta.sourceTitle === 'string' ? meta.sourceTitle : '', 140);
  const pieces = [
    `tipo: ${item.source.type}`,
    docTitle ? `documento: ${docTitle}${year ? ` (${year})` : ''}` : null,
    sourceTitle ? `origem: ${sourceTitle}` : null,
    item.source.id ? `id: ${item.source.id}` : null,
    pageStart || pageEnd ? `paginas: ${pageLabel(pageStart, pageEnd)}` : null,
  ].filter(Boolean);
  return pieces.join(' | ');
}

function markdownLink(label: string, href: string) {
  return href ? `[${label}](${href})` : label;
}

export function buildNotebookAppLink(slug: string, source: NotebookSource) {
  const meta = source.meta ?? {};
  if (source.type === 'evidence' && source.id) return `/c/${slug}/provas?selected=${source.id}&panel=detail`;
  if (source.type === 'thread' && source.id) return `/c/${slug}/debate?selected=${source.id}&panel=detail`;
  if (source.type === 'event' && source.id) return `/c/${slug}/linha?selected=${source.id}&panel=detail`;
  if (source.type === 'term' && source.id) return `/c/${slug}/glossario?selected=${source.id}&panel=detail`;
  if (source.type === 'node') {
    const nodeSlug = typeof meta.nodeSlug === 'string' ? meta.nodeSlug : source.id ?? '';
    if (nodeSlug) return `/c/${slug}/mapa?node=${encodeURIComponent(nodeSlug)}&panel=detail`;
  }
  if (source.type === 'citation' || source.type === 'chunk' || source.type === 'doc') {
    const docId = typeof meta.docId === 'string' ? meta.docId : source.id ?? '';
    const pageStart = typeof meta.pageStart === 'number' ? meta.pageStart : null;
    if (docId) return `/c/${slug}/doc/${docId}${pageStart ? `?p=${pageStart}` : ''}`;
  }
  return `/c/${slug}/meu-caderno`;
}

export function prepareNotebookExport(input: { slug: string; items: Array<Partial<NotebookExportItem>> }) {
  const normalized: NotebookExportItem[] = input.items
    .map((item) => {
      const source = item.source ?? { type: 'doc', id: null, meta: {} };
      const kind = item.kind === 'note' ? 'note' : 'highlight';
      const text = cleanText(typeof item.text === 'string' ? item.text : '', NOTEBOOK_ITEM_CHAR_LIMIT);
      if (!text) return null;
      const tags = uniqueTags(Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : []);
      return {
        kind,
        title: cleanText(typeof item.title === 'string' ? item.title : '', 160) || null,
        text,
        tags,
        source: {
          type: source.type,
          id: source.id ?? null,
          meta: source.meta ?? {},
        },
        linkToApp: cleanText(typeof item.linkToApp === 'string' ? item.linkToApp : buildNotebookAppLink(input.slug, source), 400),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
      };
    })
    .filter(Boolean) as NotebookExportItem[];

  const included = normalized.slice(0, NOTEBOOK_MAX_ITEMS);
  const tagCounts = new Map<string, number>();
  const docMap = new Map<string, { title: string; year: number | null; pages: Set<string> }>();

  for (const item of included) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    const meta = item.source.meta ?? {};
    const docTitle = cleanText(typeof meta.docTitle === 'string' ? meta.docTitle : typeof meta.title === 'string' ? meta.title : '', 140);
    const year = typeof meta.year === 'number' ? meta.year : null;
    const pageStart = typeof meta.pageStart === 'number' ? meta.pageStart : null;
    const pageEnd = typeof meta.pageEnd === 'number' ? meta.pageEnd : null;
    if (docTitle) {
      const key = `${docTitle}::${year ?? 'nd'}`;
      const current = docMap.get(key) ?? { title: docTitle, year, pages: new Set<string>() };
      current.pages.add(pageLabel(pageStart, pageEnd));
      docMap.set(key, current);
    }
  }

  return {
    items: included,
    stats: {
      totalItems: normalized.length,
      includedItems: included.length,
      omittedItems: Math.max(0, normalized.length - included.length),
      highlightCount: included.filter((item) => item.kind === 'highlight').length,
      noteCount: included.filter((item) => item.kind === 'note').length,
      topTags: Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, NOTEBOOK_TAG_INDEX_LIMIT)
        .map(([tag, count]) => ({ tag, count })),
      sourceDocs: Array.from(docMap.values()).map((item) => ({
        title: item.title,
        year: item.year,
        pages: Array.from(item.pages.values()).sort(),
      })),
      kinds: [
        ...(included.some((item) => item.kind === 'highlight') ? (['highlight'] as NotebookItemKind[]) : []),
        ...(included.some((item) => item.kind === 'note') ? (['note'] as NotebookItemKind[]) : []),
      ],
    },
  } satisfies PreparedNotebookExport;
}

function renderItemBlock(item: NotebookExportItem, index: number) {
  const lines: string[] = [];
  const title = item.title || `Item ${index + 1}`;
  lines.push(`### ${index + 1}. ${title}`);
  lines.push('');
  lines.push(item.text);
  lines.push('');
  lines.push(`- Tipo: ${item.kind}`);
  if (item.tags.length > 0) lines.push(`- Tags: ${item.tags.join(', ')}`);
  lines.push(`- Fonte: ${sourceLabel(item)}`);
  lines.push(`- ${markdownLink('Abrir no app', item.linkToApp)}`);
  lines.push('');
  return lines;
}

export function renderNotebookMarkdown(input: RenderNotebookInput) {
  const lines: string[] = [];
  lines.push(`# ${input.title}`);
  lines.push('');
  lines.push(`- Universo: ${input.universe}`);
  lines.push(`- Autor: ${input.actorLabel}`);
  lines.push(`- Gerado em: ${new Date(input.generatedAt).toISOString()}`);
  lines.push(`- Itens: ${input.stats.includedItems} (${input.stats.highlightCount} highlights, ${input.stats.noteCount} notas)`);
  if (input.stats.omittedItems > 0) lines.push(`- Observacao: +${input.stats.omittedItems} itens nao incluidos por limite de export.`);
  lines.push('');
  if (input.includeTagIndex !== false) {
    lines.push('## Indice por tags');
    lines.push('');
    if (input.stats.topTags.length === 0) {
      lines.push('- Sem tags registradas.');
    } else {
      input.stats.topTags.forEach((item) => lines.push(`- ${item.tag} (${item.count})`));
    }
    lines.push('');
  }
  lines.push('## Indice por tipo');
  lines.push('');
  lines.push(`- Highlights: ${input.stats.highlightCount}`);
  lines.push(`- Notas: ${input.stats.noteCount}`);
  lines.push('');

  const highlights = input.items.filter((item) => item.kind === 'highlight');
  const notes = input.items.filter((item) => item.kind === 'note');

  lines.push('## Highlights');
  lines.push('');
  if (highlights.length === 0) {
    lines.push('Nenhum highlight incluido.');
    lines.push('');
  } else {
    highlights.forEach((item, index) => lines.push(...renderItemBlock(item, index)));
  }

  lines.push('## Notas');
  lines.push('');
  if (notes.length === 0) {
    lines.push('Nenhuma nota incluida.');
    lines.push('');
  } else {
    notes.forEach((item, index) => lines.push(...renderItemBlock(item, index)));
  }

  lines.push('## Fontes');
  lines.push('');
  if (input.stats.sourceDocs.length === 0) {
    lines.push('- Nenhum documento identificado nos metadados exportados.');
  } else {
    input.stats.sourceDocs.forEach((item) => {
      lines.push(`- ${item.title}${item.year ? ` (${item.year})` : ''}${item.pages.length > 0 ? ` — ${item.pages.join(', ')}` : ''}`);
    });
  }
  lines.push('');
  return lines.join('\n');
}
