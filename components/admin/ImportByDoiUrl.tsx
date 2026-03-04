'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';

type ImportPreview = {
  inputType: 'doi' | 'url';
  metadata: {
    title: string;
    authors: string | null;
    year: number | null;
    journal: string | null;
    sourceUrl: string | null;
    pdfUrl: string | null;
    kind: 'doi' | 'url';
  };
  resolvedUrl: string | null;
  pdfDetected: boolean;
  pdfUrl: string | null;
};

type CommitResult = {
  document: {
    id: string;
    title: string;
    status: 'uploaded' | 'processed' | 'link_only' | 'error';
  };
  importMode: 'pdf' | 'link_only';
  warning: string | null;
};

type Props = {
  universeId: string;
  configured: boolean;
  canWrite: boolean;
};

async function postJson<T>(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    retryAfterSec?: number;
  };
  if (!response.ok) {
    const retry = json.retryAfterSec ? ` Tente em ${json.retryAfterSec}s.` : '';
    throw new Error(`${json.error ?? 'request_failed'}.${retry}`.replace(/\.$/, ''));
  }
  return json;
}

export function ImportByDoiUrl({ universeId, configured, canWrite }: Props) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [commit, setCommit] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const disabled = useMemo(() => !configured || !canWrite || isPending, [canWrite, configured, isPending]);

  const handlePreview = () => {
    if (!value.trim()) return;
    setError(null);
    setCommit(null);
    startTransition(async () => {
      try {
        const data = await postJson<ImportPreview>('/api/admin/import/preview', {
          universeId,
          value: value.trim(),
        });
        setPreview(data);
      } catch (err) {
        setPreview(null);
        setError(err instanceof Error ? err.message : 'Falha ao buscar metadados.');
      }
    });
  };

  const handleImport = () => {
    if (!value.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const data = await postJson<CommitResult>('/api/admin/import/commit', {
          universeId,
          value: value.trim(),
        });
        setCommit(data);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao importar documento.');
      }
    });
  };

  const handleEnqueue = () => {
    const documentId = commit?.document.id;
    if (!documentId) return;
    setError(null);
    startTransition(async () => {
      try {
        await postJson<{ ok: true }>('/api/admin/import/enqueue', {
          universeId,
          documentId,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao enfileirar ingestao.');
      }
    });
  };

  return (
    <Card className='stack'>
      <SectionHeader
        title='Adicionar por DOI/URL'
        description='Busca metadados e tenta importar PDF automaticamente para o bucket cv-docs.'
      />

      <label className='stack'>
        <span>DOI ou URL</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder='10.1038/s41586-023-06239-9 ou https://.../paper.pdf'
          style={{ width: '100%', minHeight: 40 }}
          disabled={disabled}
          aria-label='Entrada DOI ou URL'
        />
      </label>

      <div className='toolbar-row'>
        <button className='ui-button' type='button' onClick={handlePreview} disabled={disabled}>
          Buscar metadados
        </button>
        <button className='ui-button' type='button' data-variant='primary' onClick={handleImport} disabled={disabled}>
          Importar
        </button>
      </div>

      {error ? (
        <p role='alert' className='muted' style={{ color: 'var(--alert-0)', margin: 0 }}>
          {error}
        </p>
      ) : null}

      {preview ? (
        <article className='core-node' aria-live='polite'>
          <strong>{preview.metadata.title}</strong>
          <p className='muted' style={{ margin: 0 }}>
            tipo: {preview.inputType} | ano: {preview.metadata.year ?? 'n/a'}
          </p>
          <p className='muted' style={{ margin: 0 }}>
            autores: {preview.metadata.authors ?? 'n/a'}
          </p>
          <p className='muted' style={{ margin: 0 }}>
            periodico: {preview.metadata.journal ?? 'n/a'}
          </p>
          <p className='muted' style={{ margin: 0 }}>
            URL final: {preview.resolvedUrl ?? 'n/a'}
          </p>
          <p className='muted' style={{ margin: 0 }}>
            PDF detectado: {preview.pdfDetected ? 'sim' : 'nao'}
          </p>
        </article>
      ) : null}

      {commit ? (
        <article className='core-node' aria-live='polite'>
          <strong>{commit.document.title}</strong>
          <p className='muted' style={{ margin: 0 }}>
            status: {commit.document.status} | modo: {commit.importMode}
          </p>
          {commit.warning ? (
            <p className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>
              Aviso: {commit.warning}
            </p>
          ) : null}
          {commit.document.status === 'uploaded' ? (
            <div className='toolbar-row'>
              <button className='ui-button' type='button' onClick={handleEnqueue} disabled={disabled}>
                Enfileirar ingest
              </button>
            </div>
          ) : (
            <p className='muted' style={{ margin: 0 }}>
              Documento sem PDF armazenado. Use o upload manual para anexar arquivo.
            </p>
          )}
        </article>
      ) : null}
    </Card>
  );
}
