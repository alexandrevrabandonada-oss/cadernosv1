'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { prepareNotebookExport, renderNotebookMarkdown, type NotebookExportItem } from '@/lib/export/notebook';
import type { UserNote } from '@/lib/notes/types';

type ScopeMode = 'all' | 'filtered';
type ExportFormat = 'pdf' | 'md';

type NotebookExportControlsProps = {
  slug: string;
  universeTitle: string;
  allItems: UserNote[];
  filteredItems: UserNote[];
  isLoggedIn: boolean;
  isPublished: boolean;
};

type ExportListItem = {
  id: string;
  title: string;
  format: 'md' | 'pdf';
  is_public: boolean;
  created_at: string;
  meta: Record<string, unknown>;
};

type ExportResult = {
  downloadUrl: string | null;
  exportId: string | null;
  exportHref: string | null;
  shareHref: string | null;
};

function mapNote(slug: string, note: UserNote): NotebookExportItem {
  return {
    kind: note.kind,
    title: note.title,
    text: note.text,
    tags: note.tags,
    source: {
      type: note.sourceType,
      id: note.sourceId,
      meta: note.sourceMeta ?? {},
    },
    linkToApp: '',
    createdAt: note.createdAt,
  };
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function NotebookExportControls({ slug, universeTitle, allItems, filteredItems, isLoggedIn, isPublished }: NotebookExportControlsProps) {
  const toast = useToast();
  const uiPrefs = useUiPrefsContext();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [scope, setScope] = useState<ScopeMode>('all');
  const [includeTagIndex, setIncludeTagIndex] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [exports, setExports] = useState<ExportListItem[]>([]);

  const refreshExports = useCallback(async () => {
    if (!isLoggedIn) return;
    const response = await fetch(`/api/export/notebook?universeSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = (await response.json()) as { items?: ExportListItem[] };
    setExports(payload.items ?? []);
  }, [isLoggedIn, slug]);

  useEffect(() => {
    void refreshExports();
  }, [refreshExports]);

  function pulseFeedback() {
    if (uiPrefs?.settings.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(18);
    }
  }

  async function handleTogglePublic(item: ExportListItem, isPublic: boolean) {
    const response = await fetch('/api/export/notebook', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportId: item.id, isPublic }),
    });
    if (!response.ok) {
      toast.error('Nao foi possivel atualizar a visibilidade.');
      return;
    }
    setExports((current) => current.map((entry) => (entry.id === item.id ? { ...entry, is_public: isPublic } : entry)));
    toast.success(isPublic ? 'Export publico por link.' : 'Export voltou a privado.');
  }

  async function handleExport() {
    const sourceItems = scope === 'filtered' ? filteredItems : allItems;
    const notebookItems = sourceItems.map((item) => mapNote(slug, item));
    if (notebookItems.length === 0) {
      toast.error('Nao ha itens suficientes para exportar.');
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      if (!isLoggedIn && (!navigator.onLine || format === 'md')) {
        const prepared = prepareNotebookExport({ slug, items: notebookItems });
        const markdown = renderNotebookMarkdown({
          universe: universeTitle,
          title: `Meu Caderno - ${universeTitle}`,
          actorLabel: 'Visitante',
          items: prepared.items,
          stats: prepared.stats,
          generatedAt: new Date().toISOString(),
          includeTagIndex,
        });
        downloadBlob(`${slug}-meu-caderno.md`, new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
        setResult({ downloadUrl: null, exportId: null, exportHref: null, shareHref: null });
        pulseFeedback();
        toast.success('Export local gerado.');
        setOpen(false);
        return;
      }

      const response = await fetch('/api/export/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universeSlug: slug,
          scope,
          format,
          mode: isLoggedIn ? 'logged' : 'guest',
          includeTagIndex,
          items: sourceItems,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        assets?: Array<{ id: string; signedUrl: string | null }>;
        asset?: { fileName: string; mimeType: string; fileBase64: string };
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? 'export_failed');

      if (payload.asset) {
        downloadBlob(payload.asset.fileName, base64ToBlob(payload.asset.fileBase64, payload.asset.mimeType));
        setResult({ downloadUrl: null, exportId: null, exportHref: null, shareHref: null });
      } else {
        const asset = payload.assets?.[0] ?? null;
        setResult({
          downloadUrl: asset?.signedUrl ?? null,
          exportId: asset?.id ?? null,
          exportHref: asset?.id ? `/c/${slug}/exports/${asset.id}` : asset?.signedUrl ?? null,
          shareHref: asset?.id ? `/c/${slug}/s/export/${asset.id}` : null,
        });
        await refreshExports();
      }

      pulseFeedback();
      toast.success('Export do caderno gerado.');
      setOpen(false);
    } catch {
      toast.error('Falha ao exportar o caderno.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className='ui-button' data-variant='primary' type='button' onClick={() => setOpen(true)}>
        Exportar Meu Caderno
      </button>
      <button className='ui-button focus-only' type='button' onClick={() => setOpen(true)}>
        Exportar
      </button>

      {open ? (
        <>
          <div className='workspace-drawer-overlay is-open' onClick={() => setOpen(false)} aria-hidden='true' />
          <aside className='notebook-export-modal surface-panel' role='dialog' aria-modal='true' aria-label='Exportar Meu Caderno'>
            <div className='workspace-detail-head'>
              <strong>Exportar Meu Caderno</strong>
              <button className='ui-button' data-variant='ghost' type='button' onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>
            <div className='workspace-detail-body'>
              <label>
                <span>Formato</span>
                <select value={format} onChange={(event) => setFormat(event.currentTarget.value as ExportFormat)} style={{ width: '100%', minHeight: 42 }}>
                  <option value='pdf'>PDF</option>
                  <option value='md'>MD</option>
                </select>
              </label>
              <label>
                <span>Escopo</span>
                <select value={scope} onChange={(event) => setScope(event.currentTarget.value as ScopeMode)} style={{ width: '100%', minHeight: 42 }}>
                  <option value='all'>Tudo</option>
                  <option value='filtered'>Apenas filtros atuais</option>
                </select>
              </label>
              <label className='notebook-export-toggle'>
                <input type='checkbox' checked={includeTagIndex} onChange={(event) => setIncludeTagIndex(event.currentTarget.checked)} />
                <span>Incluir tags no indice</span>
              </label>
              {!isLoggedIn ? (
                <p className='muted' style={{ margin: 0 }}>
                  Visitante: export local por padrao. Offline gera MD no cliente; online pode gerar PDF temporario sem persistir.
                </p>
              ) : (
                <p className='muted' style={{ margin: 0 }}>
                  Logado: export salvo em storage privado por padrao. Compartilhamento exige tornar publico manualmente.
                </p>
              )}
              <div className='toolbar-row'>
                <button className='ui-button' data-variant='primary' type='button' onClick={() => void handleExport()} disabled={submitting}>
                  {submitting ? 'Gerando...' : 'Gerar export'}
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {result ? (
        <article className='core-node stack'>
          <strong>Export pronto</strong>
          <p className='muted' style={{ margin: 0 }}>
            Pack de estudo gerado com fontes e links de origem.
          </p>
          <div className='toolbar-row'>
            {result.downloadUrl ? (
              <a className='ui-button' href={result.downloadUrl} target='_blank' rel='noreferrer'>
                Baixar
              </a>
            ) : null}
            {result.exportHref ? (
              <Link className='ui-button' data-variant='ghost' href={result.exportHref}>
                Ver export
              </Link>
            ) : null}
          </div>
        </article>
      ) : null}

      {isLoggedIn ? (
        <article className='core-node stack'>
          <strong>Exports do caderno</strong>
          <p className='muted' style={{ margin: 0 }}>
            Privado por padrao. Tornar publico expõe suas notas pelo link e so funciona em universo publicado.
          </p>
          <div className='stack'>
            {exports.length === 0 ? (
              <p className='muted' style={{ margin: 0 }}>
                Nenhum export de notebook salvo ainda.
              </p>
            ) : (
              exports.map((item) => (
                <article key={item.id} className='surface-blade notebook-export-row'>
                  <div>
                    <strong>{item.title}</strong>
                    <p className='muted' style={{ margin: 0 }}>
                      {item.format.toUpperCase()} | {new Date(item.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className='toolbar-row'>
                    <Link className='ui-button' data-variant='ghost' href={`/c/${slug}/exports/${item.id}`}>
                      Ver export
                    </Link>
                    <button className='ui-button' type='button' onClick={() => void handleTogglePublic(item, !item.is_public)}>
                      {item.is_public ? 'Tornar privado' : 'Tornar publico'}
                    </button>
                    {item.is_public ? (
                      <Link className='ui-button' data-variant='ghost' href={`/c/${slug}/s/export/${item.id}`}>
                        Share
                      </Link>
                    ) : null}
                  </div>
                  {!isPublished ? (
                    <p className='muted' style={{ margin: 0 }}>
                      Aviso: o universo ainda nao esta publicado; o share publico so abre depois da publicacao.
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </article>
      ) : null}
    </>
  );
}
