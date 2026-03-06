'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { HighlightInspector } from '@/components/doc/HighlightInspector';
import { HighlightLayer } from '@/components/doc/HighlightLayer';
import { SelectionToolbar } from '@/components/doc/SelectionToolbar';
import { SaveToNotebookButton } from '@/components/notes/SaveToNotebookButton';
import { CopyCitationButton } from '@/components/provas/CopyCitationButton';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { FocusToggle } from '@/components/ui/FocusToggle';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useToast } from '@/components/ui/Toast';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { useUserNotes } from '@/hooks/useUserNotes';
import { feedback } from '@/lib/feedback/feedback';
import { useStudyTracker } from '@/hooks/useStudyTracker';
import { normalizeSelection, reanchorHighlight, type AppliedHighlight, type HighlightSelectionMeta } from '@/lib/highlights/anchor';
import type { DocThreadCitation, DocViewChunk, DocViewData } from '@/lib/data/debate';
import { buildUniverseHref } from '@/lib/universeNav';

const MAX_SELECTION_CHARS = 800;

type DocumentReaderClientProps = {
  slug: string;
  doc: DocViewData;
  pageHint: string;
  threadId: string;
  citations: DocThreadCitation[];
  selectedCitationId: string;
  canExportClip: boolean;
};

type ToolbarState = {
  open: boolean;
  x: number;
  y: number;
  expanded: boolean;
};

function pageLabel(start: number | null, end: number | null) {
  if (!start && !end) return 's/p';
  if (start && end && start !== end) return `p.${start}-${end}`;
  return `p.${start ?? end}`;
}

function selectionPosition(range: Range) {
  const rect = range.getBoundingClientRect();
  return {
    x: Math.min(window.innerWidth - 360, Math.max(12, rect.left + rect.width / 2 - 140)),
    y: Math.max(12, rect.top + window.scrollY - 72),
  };
}

function normalizeCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

function clipForCopy(value: string, max = MAX_SELECTION_CHARS) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function citationPageLabel(citation: Pick<DocThreadCitation, 'pageStart' | 'pageEnd'>) {
  return pageLabel(citation.pageStart, citation.pageEnd);
}

function formatCitationLine(citation: DocThreadCitation) {
  const yearLabel = citation.year ? String(citation.year) : 's.d.';
  return `${citation.docTitle} (${yearLabel}), ${citationPageLabel(citation)}: "${citation.quote}"`;
}

function buildChunkPageHint(chunks: DocViewChunk[], startOffset: number, endOffset: number) {
  let cursor = 0;
  for (const chunk of chunks) {
    const next = cursor + chunk.text.length;
    if (startOffset < next || endOffset <= next) return pageLabel(chunk.pageStart, chunk.pageEnd);
    cursor = next;
  }
  return 's/p';
}

function extractAppliedHighlight(note: ReturnType<typeof useUserNotes>['notes'][number]): AppliedHighlight | null {
  if (note.sourceType !== 'doc' || note.kind !== 'highlight') return null;
  const meta = note.sourceMeta ?? {};
  const startOffset = typeof meta.startOffset === 'number' ? meta.startOffset : null;
  const endOffset = typeof meta.endOffset === 'number' ? meta.endOffset : null;
  const quote = typeof meta.quote === 'string' ? meta.quote : note.text;
  if (startOffset === null || endOffset === null || endOffset <= startOffset) return null;
  return { id: note.id, startOffset, endOffset, quote };
}

function extractStoredNote(note: ReturnType<typeof useUserNotes>['notes'][number]) {
  const metaNote = typeof note.sourceMeta?.note === 'string' ? note.sourceMeta.note.trim() : '';
  if (metaNote) return metaNote;
  const quote = typeof note.sourceMeta?.quote === 'string' ? note.sourceMeta.quote.trim() : '';
  if (!quote) return '';
  const text = note.text.trim();
  if (!text.startsWith(quote)) return text;
  return text.slice(quote.length).replace(/^\s*Nota:\s*/i, '').trim();
}

export function DocumentReaderClient({ slug, doc, pageHint, threadId, citations, selectedCitationId, canExportClip }: DocumentReaderClientProps) {
  const toast = useToast();
  const uiPrefs = useUiPrefsContext();
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [toolbar, setToolbar] = useState<ToolbarState>({ open: false, x: 0, y: 0, expanded: false });
  const [selectionMeta, setSelectionMeta] = useState<HighlightSelectionMeta | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [resolvedHighlights, setResolvedHighlights] = useState<AppliedHighlight[]>([]);
  const [inspectorTitle, setInspectorTitle] = useState('');
  const [inspectorNote, setInspectorNote] = useState('');
  const [inspectorTags, setInspectorTags] = useState('');
  const { notes, createNote, updateNote, deleteNote } = useUserNotes({ universeSlug: slug });
  const { trackAction } = useStudyTracker();

  const docHighlights = useMemo(
    () => notes.filter((note) => note.sourceType === 'doc' && note.sourceId === doc.id && note.kind === 'highlight'),
    [doc.id, notes],
  );

  const appliedHighlights = useMemo(
    () => docHighlights.map((note) => extractAppliedHighlight(note)).filter(Boolean) as AppliedHighlight[],
    [docHighlights],
  );

  const selectedCitation = citations.find((item) => item.citationId === selectedCitationId) ?? citations[0] ?? null;
  const selectedHighlight = docHighlights.find((item) => item.id === activeHighlightId) ?? null;

  const clearSelectionUi = useCallback(() => {
    setToolbar({ open: false, x: 0, y: 0, expanded: false });
    setSelectionMeta(null);
    setDraftTitle('');
    setDraftNote('');
    setDraftTags('');
    window.getSelection()?.removeAllRanges();
  }, []);

  const saveSelection = useCallback(async () => {
    if (!selectionMeta) return;
    if (selectionMeta.quote.length > MAX_SELECTION_CHARS) {
      toast.error('Selecione ate 800 caracteres por highlight.');
      return;
    }

    const text = draftNote.trim() ? `${selectionMeta.quote}\n\nNota: ${draftNote.trim()}` : selectionMeta.quote;
    const note = await createNote({
      kind: 'highlight',
      title: draftTitle.trim() || `Highlight: ${doc.title}`,
      text,
      sourceType: 'doc',
      sourceId: doc.id,
      sourceMeta: {
        docId: doc.id,
        docTitle: doc.title,
        startOffset: selectionMeta.startOffset,
        endOffset: selectionMeta.endOffset,
        quote: selectionMeta.quote,
        pageHint: buildChunkPageHint(doc.chunks, selectionMeta.startOffset, selectionMeta.endOffset),
        anchor: selectionMeta.anchor,
        locator: `doc:${doc.id}:${selectionMeta.startOffset}-${selectionMeta.endOffset}`,
        note: draftNote.trim() || null,
      },
      tags: normalizeCsv(draftTags),
    });

    if (!note) {
      toast.error('Falha ao salvar highlight.');
      feedback('warning', uiPrefs?.settings);
      return;
    }

    setActiveHighlightId(note.id);
    trackAction({
      action: 'highlight_created',
      item: {
        type: 'highlight',
        id: note.id,
        label: note.title ?? `Highlight: ${doc.title}`,
        href: `${buildUniverseHref(slug, `doc/${doc.id}`)}?hl=${encodeURIComponent(note.id)}`,
        tags: note.tags,
      },
      lastSection: uiPrefs?.settings.last_section,
    });
    toast.success('Highlight salvo no Meu Caderno.');
    feedback('success', uiPrefs?.settings);
    clearSelectionUi();
  }, [clearSelectionUi, createNote, doc.chunks, doc.id, doc.title, draftNote, draftTags, draftTitle, selectionMeta, slug, toast, trackAction, uiPrefs?.settings]);

  const handleCopySelection = useCallback(async () => {
    if (!selectionMeta) return;
    await navigator.clipboard.writeText(clipForCopy(selectionMeta.quote));
    toast.success('Trecho copiado.');
    feedback('tap', uiPrefs?.settings);
  }, [selectionMeta, toast, uiPrefs?.settings]);

  const handleExportSelection = useCallback(async () => {
    if (!selectionMeta || !canExportClip) return;
    const response = await fetch('/api/admin/export/clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        universeSlug: slug,
        sourceType: 'doc_cite',
        sourceId: `${doc.id}-${selectionMeta.startOffset}-${selectionMeta.endOffset}`,
        title: `Clip: ${doc.title}`,
        snippet: selectionMeta.quote,
        docId: doc.id,
        sourceUrl: doc.sourceUrl,
        isPublic: false,
      }),
    });
    if (!response.ok) {
      toast.error('Falha ao exportar trecho.');
      return;
    }
    toast.success('Clip gerado.');
    feedback('success', uiPrefs?.settings);
  }, [canExportClip, doc.id, doc.sourceUrl, doc.title, selectionMeta, slug, toast, uiPrefs?.settings]);

  useEffect(() => {
    const handler = () => {
      const container = contentRef.current;
      const selection = window.getSelection();
      if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setToolbar((current) => (current.open ? { open: false, x: 0, y: 0, expanded: false } : current));
        setSelectionMeta(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setToolbar((current) => (current.open ? { open: false, x: 0, y: 0, expanded: false } : current));
        setSelectionMeta(null);
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement?.closest('input, textarea, [contenteditable="true"]')) return;

      const normalized = normalizeSelection(container, selection);
      if (!normalized || !normalized.quote || normalized.quote.length > MAX_SELECTION_CHARS) {
        setToolbar((current) => (current.open ? { open: false, x: 0, y: 0, expanded: false } : current));
        setSelectionMeta(null);
        return;
      }

      const position = selectionPosition(range);
      setSelectionMeta(normalized);
      setToolbar((current) => ({
        open: true,
        x: position.x,
        y: position.y,
        expanded: current.expanded && Boolean(draftNote || draftTitle || draftTags),
      }));
    };

    document.addEventListener('selectionchange', handler);
    return () => {
      document.removeEventListener('selectionchange', handler);
    };
  }, [draftNote, draftTags, draftTitle]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const anchored = docHighlights
      .map((note) => {
        const meta = note.sourceMeta ?? {};
        const startOffset = typeof meta.startOffset === 'number' ? meta.startOffset : null;
        const endOffset = typeof meta.endOffset === 'number' ? meta.endOffset : null;
        const quote = typeof meta.quote === 'string' ? meta.quote : note.text;
        const anchor = meta.anchor && typeof meta.anchor === 'object' ? (meta.anchor as HighlightSelectionMeta['anchor']) : null;
        if (startOffset === null || endOffset === null) return null;
        const resolved = anchor ? reanchorHighlight(container, { startOffset, endOffset, quote, anchor }) : { startOffset, endOffset };
        if (!resolved) return null;
        return { id: note.id, startOffset: resolved.startOffset, endOffset: resolved.endOffset, quote } satisfies AppliedHighlight;
      })
      .filter(Boolean) as AppliedHighlight[];
    setResolvedHighlights(anchored);
  }, [docHighlights]);

  useEffect(() => {
    const hl = searchParams.get('hl');
    if (!hl || !contentRef.current) return;
    const mark = contentRef.current.querySelector<HTMLElement>(`mark[data-highlight-id="${hl}"]`);
    if (!mark) return;
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mark.dataset.pulse = 'true';
    window.setTimeout(() => {
      mark.dataset.pulse = 'false';
    }, 2200);
    setActiveHighlightId(hl);
  }, [docHighlights, searchParams]);

  useEffect(() => {
    if (!selectedHighlight) return;
    setInspectorTitle(selectedHighlight.title ?? '');
    setInspectorNote(extractStoredNote(selectedHighlight));
    setInspectorTags(selectedHighlight.tags.join(','));
  }, [selectedHighlight]);

  const inspectorPageHint = typeof selectedHighlight?.sourceMeta?.pageHint === 'string' ? selectedHighlight.sourceMeta.pageHint : pageHint;

  return (
    <div className='stack doc-reader-shell'>
      <Card className='stack doc-reader-card'>
        <SectionHeader title={doc.title} description='Visualizacao de texto com highlights privados do usuario.' tag='Documento' />
        <p className='muted' style={{ margin: 0 }}>
          Status: {doc.status} | Pagina sugerida: {pageHint}
        </p>
        <p className='muted' style={{ margin: 0 }}>
          Autor(es): {doc.authors || 'n/d'} {doc.year ? `| Ano: ${doc.year}` : ''}
        </p>
        <div className='toolbar-row'>
          <FocusToggle compactLabel />
          {doc.signedUrl ? (
            <Link className='ui-button' href={doc.signedUrl} target='_blank' rel='noreferrer'>
              Abrir PDF no Storage
            </Link>
          ) : null}
          {doc.sourceUrl ? (
            <Link className='ui-button' href={doc.sourceUrl} target='_blank' rel='noreferrer'>
              Abrir fonte original
            </Link>
          ) : null}
          <Link className='ui-button' href={buildUniverseHref(slug, 'meu-caderno')}>
            Ir para Meu Caderno
          </Link>
        </div>
      </Card>

      <div className='layout-shell doc-reader-grid' style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)' }}>
        <Card className='stack doc-reader-card'>
          <SectionHeader title='Leitura e selecao real' description='Selecione texto para destacar, anotar, copiar ou exportar trecho.' tag='Reader' />
          <div className='toolbar-row'>
            <Carimbo>{`chunks:${doc.chunks.length}`}</Carimbo>
            <Carimbo>{`highlights:${docHighlights.length}`}</Carimbo>
          </div>
          <div ref={contentRef} className='doc-text-surface' data-testid='doc-text-surface'>
            {doc.chunks.length > 0 ? (
              doc.chunks.map((chunk) => (
                <p key={chunk.id} data-page={pageLabel(chunk.pageStart, chunk.pageEnd)} className='doc-text-block'>
                  {chunk.text}
                </p>
              ))
            ) : (
              <p className='muted' style={{ margin: 0 }}>
                Este documento ainda nao tem texto processado para highlights reais.
              </p>
            )}
          </div>
          <HighlightLayer
            container={contentRef.current}
            highlights={resolvedHighlights.length > 0 ? resolvedHighlights : appliedHighlights}
            activeId={activeHighlightId}
            onClickHighlight={setActiveHighlightId}
          />
        </Card>

        <div className='stack'>
          {selectedCitation ? (
            <Card className='stack'>
              <SectionHeader title='Citacao em foco' description={`Thread ${threadId} | ${citations.length} citacao(oes)`} tag='Thread' />
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedCitation.quote}</p>
              <div className='toolbar-row'>
                <CopyCitationButton citation={formatCitationLine(selectedCitation)} />
                <SaveToNotebookButton
                  universeSlug={slug}
                  kind='highlight'
                  title={`Citacao: ${doc.title}`}
                  text={selectedCitation.quote}
                  sourceType='citation'
                  sourceId={selectedCitation.citationId}
                  sourceMeta={{ docId: doc.id, docTitle: doc.title, pageStart: selectedCitation.pageStart, pageEnd: selectedCitation.pageEnd, threadId: selectedCitation.threadId }}
                  tags={[]}
                  label='Salvar citacao'
                  compact
                />
              </div>
            </Card>
          ) : null}

          <HighlightInspector
            open={Boolean(selectedHighlight)}
            quote={typeof selectedHighlight?.sourceMeta?.quote === 'string' ? selectedHighlight.sourceMeta.quote : selectedHighlight?.text ?? ''}
            title={inspectorTitle}
            note={inspectorNote}
            tags={inspectorTags}
            pageHint={inspectorPageHint}
            onTitleChange={setInspectorTitle}
            onNoteChange={setInspectorNote}
            onTagsChange={setInspectorTags}
            onSave={async () => {
              if (!selectedHighlight) return;
              const quote = typeof selectedHighlight.sourceMeta?.quote === 'string' ? selectedHighlight.sourceMeta.quote : selectedHighlight.text;
              await updateNote(selectedHighlight.id, {
                title: inspectorTitle || null,
                text: inspectorNote.trim() ? `${quote}\n\nNota: ${inspectorNote.trim()}` : quote,
                tags: normalizeCsv(inspectorTags),
              });
              toast.success('Highlight atualizado.');
            }}
            onDelete={async () => {
              if (!selectedHighlight) return;
              await deleteNote(selectedHighlight.id);
              setActiveHighlightId(null);
              toast.success('Highlight removido.');
            }}
            onClose={() => setActiveHighlightId(null)}
          />
        </div>
      </div>

      <SelectionToolbar
        open={toolbar.open}
        x={toolbar.x}
        y={toolbar.y}
        expanded={toolbar.expanded}
        title={draftTitle}
        note={draftNote}
        tags={draftTags}
        onTitleChange={setDraftTitle}
        onNoteChange={setDraftNote}
        onTagsChange={setDraftTags}
        onHighlight={() => void saveSelection()}
        onAddNote={() => setToolbar((current) => ({ ...current, expanded: true }))}
        onCopy={() => void handleCopySelection()}
        onExport={() => void handleExportSelection()}
        onCancel={clearSelectionUi}
      />
    </div>
  );
}




