'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Carimbo } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import type { SharedNotebookSummary, SharedNotebookSourceType } from '@/lib/shared-notebooks/types';

const templateLabels: Record<string, string> = {
  weekly_base: 'Base da semana',
  clipping: 'Clipping',
  study_group: 'Grupo de estudo',
  thematic_core: 'Nucleo tematico',
};

type AddToSharedNotebookButtonProps = {
  universeSlug: string;
  sourceType: SharedNotebookSourceType;
  sourceId?: string | null;
  title?: string | null;
  text: string;
  sourceMeta?: Record<string, unknown>;
  tags?: string[];
  noteLabel?: string;
  label?: string;
  compact?: boolean;
};

export function AddToSharedNotebookButton({
  universeSlug,
  sourceType,
  sourceId = null,
  title = null,
  text,
  sourceMeta = {},
  tags = [],
  noteLabel = 'Nota coletiva (opcional)',
  label = 'Adicionar ao coletivo',
  compact = false,
}: AddToSharedNotebookButtonProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notebooks, setNotebooks] = useState<SharedNotebookSummary[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState('');
  const [note, setNote] = useState('');
  const [extraTags, setExtraTags] = useState('');

  const selectedNotebook = useMemo(() => notebooks.find((item) => item.id === selectedNotebookId) ?? null, [notebooks, selectedNotebookId]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/shared-notebooks?universeSlug=${encodeURIComponent(universeSlug)}&mode=available&sourceType=${encodeURIComponent(sourceType)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('not_available');
        const payload = (await response.json()) as { items?: SharedNotebookSummary[] };
        if (!alive) return;
        const items = payload.items ?? [];
        setNotebooks(items);
        setSelectedNotebookId(items[0]?.id ?? '');
      })
      .catch(() => {
        if (!alive) return;
        setNotebooks([]);
        setSelectedNotebookId('');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, sourceType, universeSlug]);

  async function onSave() {
    if (!selectedNotebookId) {
      toast.error('Selecione um coletivo antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/shared-notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          notebookId: selectedNotebookId,
          universeSlug,
          sourceType,
          sourceId,
          title,
          text,
          sourceMeta,
          tags: Array.from(new Set([...tags, ...extraTags.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)])).slice(0, 12),
          note: note.trim() || null,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'save_failed');
      toast.success('Item adicionado ao coletivo.');
      setOpen(false);
      setNote('');
      setExtraTags('');
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'not_available' ? 'Somente usuarios logados podem usar coletivos.' : 'Falha ao adicionar ao coletivo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className='ui-button' data-variant={compact ? 'ghost' : undefined} type='button' onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <>
          <div className='workspace-drawer-overlay is-open' onClick={() => setOpen(false)} aria-hidden='true' />
          <aside className='notebook-export-modal surface-panel' role='dialog' aria-modal='true' aria-label='Adicionar ao coletivo'>
            <div className='workspace-detail-head'>
              <strong>Adicionar ao coletivo</strong>
              <button className='ui-button' data-variant='ghost' type='button' onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>
            <div className='workspace-detail-body stack'>
              {loading ? <p className='muted' style={{ margin: 0 }}>Carregando coletivos...</p> : null}
              {!loading && notebooks.length === 0 ? (
                <div className='stack'>
                  <p className='muted' style={{ margin: 0 }}>Nenhum coletivo editavel encontrado para este usuario.</p>
                  <Link className='ui-button' href={`/c/${universeSlug}/coletivos/novo`} onClick={() => setOpen(false)}>
                    Criar por template
                  </Link>
                </div>
              ) : (
                <>
                  <label>
                    <span>Coletivo</span>
                    <select value={selectedNotebookId} onChange={(event) => setSelectedNotebookId(event.currentTarget.value)} style={{ width: '100%', minHeight: 42 }}>
                      {notebooks.map((item) => (
                        <option key={item.id} value={item.id}>{item.title}</option>
                      ))}
                    </select>
                  </label>
                  {selectedNotebook ? (
                    <div className='stack'>
                      <div className='toolbar-row'>
                        {selectedNotebook.templateId ? <Carimbo>{templateLabels[selectedNotebook.templateId] ?? selectedNotebook.templateId}</Carimbo> : <Carimbo>Em branco</Carimbo>}
                        {selectedNotebook.templateMeta.preferredSources.slice(0, 3).map((value) => (
                          <Carimbo key={value}>{value}</Carimbo>
                        ))}
                      </div>
                      <p className='muted' style={{ margin: 0 }}>{selectedNotebook.templateMeta.microcopy}</p>
                    </div>
                  ) : null}
                  <label>
                    <span>{noteLabel}</span>
                    <textarea value={note} onChange={(event) => setNote(event.currentTarget.value)} rows={3} style={{ width: '100%' }} />
                  </label>
                  <label>
                    <span>Tags extras (csv)</span>
                    <input value={extraTags} onChange={(event) => setExtraTags(event.currentTarget.value)} style={{ width: '100%', minHeight: 42 }} />
                  </label>
                  <div className='toolbar-row'>
                    <button className='ui-button' type='button' onClick={() => void onSave()} disabled={saving || !selectedNotebookId}>
                      {saving ? 'Salvando...' : 'Adicionar'}
                    </button>
                    <Link className='ui-button' data-variant='ghost' href={`/c/${universeSlug}/coletivos`} onClick={() => setOpen(false)}>
                      Ver coletivos
                    </Link>
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
