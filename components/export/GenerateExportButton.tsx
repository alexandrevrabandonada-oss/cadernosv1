'use client';

import { useState } from 'react';
import { ShareButton } from '@/components/share/ShareButton';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { useToast } from '@/components/ui/Toast';
import { feedback } from '@/lib/feedback/feedback';

type ExportAsset = {
  id: string;
  format: 'md' | 'pdf';
  signedUrl: string | null;
};

type ExportResponse = {
  ok: boolean;
  title: string;
  assets: ExportAsset[];
};

type Props = {
  endpoint: '/api/admin/export/thread' | '/api/admin/export/trail' | '/api/admin/export/session' | '/api/admin/export/clip';
  label: string;
  payload: Record<string, unknown>;
  disabled?: boolean;
  shareSlug?: string;
};

export function GenerateExportButton({ endpoint, label, payload, disabled = false, shareSlug = '' }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResponse | null>(null);
  const toast = useToast();
  const prefs = useUiPrefsContext();

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as ExportResponse & { error?: string; retryAfterSec?: number };
      if (!response.ok) {
        if (json.error === 'rate_limited') {
          throw new Error(`Muitas acoes em pouco tempo. Tente novamente em ${json.retryAfterSec ?? 1}s.`);
        }
        if (response.status === 403) {
          throw new Error('Somente editor/admin pode gerar export.');
        }
        throw new Error(json.error ?? 'Falha ao gerar export.');
      }
      setResult(json);
      toast.success('Export gerado');
      feedback('success', prefs?.settings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado.';
      setError(message);
      toast.error(message);
      feedback('warning', prefs?.settings);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='stack'>
      <button className='ui-button' type='button' onClick={onGenerate} disabled={disabled || loading}>
        {loading ? 'Gerando...' : label}
      </button>
      {error ? (
        <p className='muted' style={{ margin: 0, color: 'var(--alert-0)' }} role='alert'>
          {error}
        </p>
      ) : null}
      {result ? (
        <div className='core-node' role='status' aria-live='polite'>
          <strong>{result.title}</strong>
          <div className='toolbar-row'>
            {result.assets.map((asset) =>
              asset.signedUrl ? (
                <a key={asset.id} className='ui-button' href={asset.signedUrl} target='_blank' rel='noreferrer'>
                  Baixar {asset.format.toUpperCase()}
                </a>
              ) : (
                <span key={asset.id} className='muted'>
                  {asset.format.toUpperCase()} sem link
                </span>
              ),
            )}
            {shareSlug ? (
              (() => {
                const shareAsset = result.assets.find((asset) => asset.format === 'pdf') ?? result.assets[0];
                if (!shareAsset) return null;
                return (
                  <ShareButton
                    url={`/c/${shareSlug}/s/export/${shareAsset.id}`}
                    title={result.title}
                    text='Dossie compartilhavel do Cadernos Vivos.'
                    label='Compartilhar dossie'
                  />
                );
              })()
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
