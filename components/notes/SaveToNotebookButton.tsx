'use client';

import { useStudyTracker } from '@/hooks/useStudyTracker';
import { useToast } from '@/components/ui/Toast';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { feedback } from '@/lib/feedback/feedback';
import type { NoteSourceType } from '@/lib/notes/types';
import { buildUniverseHref } from '@/lib/universeNav';
import { useUserNotes } from '@/hooks/useUserNotes';

type SaveToNotebookButtonProps = {
  universeSlug: string;
  kind?: 'highlight' | 'note';
  title?: string | null;
  text: string;
  sourceType: NoteSourceType;
  sourceId?: string | null;
  sourceMeta?: Record<string, unknown>;
  tags?: string[];
  label?: string;
  compact?: boolean;
};

function buildSourceHref(slug: string, sourceType: NoteSourceType, sourceId: string | null | undefined, sourceMeta: Record<string, unknown>) {
  if (sourceType === 'evidence' && sourceId) return `${buildUniverseHref(slug, 'provas')}?selected=${sourceId}&panel=detail`;
  if (sourceType === 'thread' && sourceId) return `${buildUniverseHref(slug, 'debate')}?selected=${sourceId}&panel=detail`;
  if (sourceType === 'event' && sourceId) return `${buildUniverseHref(slug, 'linha')}?selected=${sourceId}&panel=detail`;
  if (sourceType === 'term' && sourceId) return `${buildUniverseHref(slug, 'glossario')}?selected=${sourceId}&panel=detail`;
  if (sourceType === 'node') {
    const nodeSlug = typeof sourceMeta.nodeSlug === 'string' ? sourceMeta.nodeSlug : '';
    if (nodeSlug) return `${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(nodeSlug)}&panel=detail`;
  }
  if (sourceType === 'doc' || sourceType === 'citation' || sourceType === 'chunk') {
    const docId = typeof sourceMeta.docId === 'string' ? sourceMeta.docId : sourceId ?? '';
    if (docId) {
      const params = new URLSearchParams();
      const pageStart = typeof sourceMeta.pageStart === 'number' ? sourceMeta.pageStart : null;
      if (pageStart) params.set('p', String(pageStart));
      return `${buildUniverseHref(slug, `doc/${docId}`)}${params.toString() ? `?${params.toString()}` : ''}`;
    }
  }
  return buildUniverseHref(slug, 'meu-caderno');
}

export function SaveToNotebookButton({
  universeSlug,
  kind = 'highlight',
  title,
  text,
  sourceType,
  sourceId = null,
  sourceMeta = {},
  tags = [],
  label = 'Salvar no meu caderno',
  compact = false,
}: SaveToNotebookButtonProps) {
  const { createNote } = useUserNotes({ universeSlug });
  const { trackAction } = useStudyTracker();
  const toast = useToast();
  const prefs = useUiPrefsContext();

  async function onSave() {
    const created = await createNote({
      kind,
      title: title ?? null,
      text,
      sourceType,
      sourceId,
      sourceMeta,
      tags,
    });
    if (created) {
      trackAction({
        action: kind === 'highlight' ? 'highlight_created' : 'note_created',
        item: {
          type: kind,
          id: created.id,
          label: created.title ?? `Entrada ${kind}`,
          href: buildSourceHref(universeSlug, sourceType, sourceId, sourceMeta),
          nodeSlug: typeof sourceMeta.nodeSlug === 'string' ? sourceMeta.nodeSlug : null,
          tags,
        },
        lastSection: prefs?.settings.last_section,
      });
      toast.success('Salvo no meu caderno');
      feedback('success', prefs?.settings);
      return;
    }
    toast.error('Falha ao salvar no caderno');
    feedback('warning', prefs?.settings);
  }

  return (
    <button className='ui-button' data-variant={compact ? 'ghost' : undefined} type='button' onClick={() => void onSave()}>
      {label}
    </button>
  );
}
