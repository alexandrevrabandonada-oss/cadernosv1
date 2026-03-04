'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';
import { ShareButton } from '@/components/share/ShareButton';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

type Citation = {
  citationId: string;
  threadId: string;
  docId: string;
  docTitle: string;
  year: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  quote: string;
};

type AskCitation = {
  citationId: string | null;
  threadId: string | null;
  docId: string;
  doc: string;
  year: number | null;
  pages: string;
  quote: string;
};

type AskResponse = {
  answer: string;
  mode: 'strict_ok' | 'insufficient';
  threadId: string | null;
  insufficientReason?: string | null;
  citations: AskCitation[];
};

type Props = {
  slug: string;
  universeId: string;
  threadId: string;
  nodeSlug: string;
  provasHref: string;
  firstEvidenceHref: string | null;
  citations: Citation[];
  currentUrl: string;
  shareUrl: string;
};

function clip(text: string, max = 200) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

export function ThreadDetailActions({
  slug,
  universeId,
  threadId,
  nodeSlug,
  provasHref,
  firstEvidenceHref,
  citations,
  currentUrl,
  shareUrl,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);
  const toast = useToast();

  const documentIds = useMemo(() => Array.from(new Set(citations.map((citation) => citation.docId))), [citations]);

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
      toast.error('Falha ao copiar link');
    }
  }

  async function onFollowUp() {
    const question = followUp.trim();
    if (question.length < 8) {
      setError('Follow-up precisa ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universeSlug: slug,
          question,
          nodeSlug: nodeSlug || undefined,
          source: 'default',
          scope: {
            mode: 'default',
            documentIds,
          },
        }),
      });
      const data = (await response.json()) as AskResponse & { error?: string; retryAfterSec?: number; message?: string };
      if (!response.ok) {
        if (response.status === 429 && data.error === 'rate_limited') {
          throw new Error(`Muitas perguntas em pouco tempo. Tente novamente em ${data.retryAfterSec ?? 1}s.`);
        }
        throw new Error(data.message ?? data.error ?? 'Falha ao executar follow-up.');
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado no follow-up.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='stack'>
      <div className='toolbar-row'>
        <Link className='ui-button' href={provasHref}>
          Ver Provas
        </Link>
        {firstEvidenceHref ? (
          <Link className='ui-button' data-variant='ghost' href={firstEvidenceHref}>
            Abrir 1a evidencia
          </Link>
        ) : null}
        <ShareButton url={shareUrl} title='Thread do Debate' text='Debate com evidencias no Cadernos Vivos' />
        <button className='ui-button' type='button' data-variant='ghost' onClick={onCopyLink}>
          {copied ? 'Link copiado' : 'Copiar link'}
        </button>
      </div>

      <GenerateExportButton
        endpoint='/api/admin/export/thread'
        label='Gerar dossie'
        payload={{ universeId, threadId, isPublic: false }}
        shareSlug={slug}
      />

      <Card className='stack'>
        <strong>Perguntar follow-up</strong>
        <textarea
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          rows={3}
          placeholder='Aprofunde esta thread com foco nas evidencias citadas...'
          style={{ width: '100%' }}
        />
        <button className='ui-button' type='button' onClick={onFollowUp} disabled={loading}>
          {loading ? 'Consultando...' : 'Enviar follow-up'}
        </button>
        {error ? (
          <p role='alert' className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>
            {error}
          </p>
        ) : null}
      </Card>

      {result ? (
        <Card className='stack' role='status' aria-live='polite'>
          <strong>Resultado do follow-up</strong>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.answer}</p>
          {result.insufficientReason ? (
            <p className='muted' style={{ margin: 0 }}>
              Limite: {result.insufficientReason}
            </p>
          ) : null}
          <div className='stack'>
            {result.citations.slice(0, 4).map((citation, index) => (
              <article key={citation.citationId ?? `${citation.docId}-${index}`} className='core-node'>
                <strong>
                  {citation.doc} {citation.year ? `(${citation.year})` : ''}
                </strong>
                <p className='muted' style={{ margin: 0 }}>
                  {citation.pages}
                </p>
                <p style={{ margin: 0 }}>{clip(citation.quote, 260)}</p>
              </article>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
