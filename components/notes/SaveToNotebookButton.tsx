'use client';

import { useToast } from '@/components/ui/Toast';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { feedback } from '@/lib/feedback/feedback';
import type { NoteSourceType } from '@/lib/notes/types';
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
