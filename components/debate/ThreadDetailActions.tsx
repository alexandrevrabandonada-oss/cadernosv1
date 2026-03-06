'use client';

import { useMemo, useState } from 'react';
import { PrefetchLink } from '@/components/nav/PrefetchLink';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';
import { ShareButton } from '@/components/share/ShareButton';
import { Card } from '@/components/ui/Card';
import { SaveToNotebookButton } from '@/components/notes/SaveToNotebookButton';
import { AddToSharedNotebookButton } from '@/components/shared-notebooks/AddToSharedNotebookButton';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { useToast } from '@/components/ui/Toast';
import { feedback } from '@/lib/feedback/feedback';

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
  confidence?: { score: number; label: 'forte' | 'media' | 'fraca' };
  limitations?: string[];
  divergence?: { flag: boolean; summary: string | null };
  citations: AskCitation[];
};

type Props = {
  slug: string;
  universeId: string;
  threadId: string;
  question: string;
  answer: string;
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
  question,
  answer,
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
  const prefs = useUiPrefsContext();

  const documentIds = useMemo(() => Array.from(new Set(citations.map((citation) => citation.docId))), [citations]);

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success('Link copiado');
      feedback('tap', prefs?.settings);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
      toast.error('Falha ao copiar link');
      feedback('warning', prefs?.settings);
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
        <PrefetchLink
          className='ui-button'
          href={provasHref}
          data-track-event='cta_click'
          data-track-cta='ver_provas'
          data-track-section='debate_detail'
        >
          Ver Provas
        </PrefetchLink>
        {firstEvidenceHref ? (
          <PrefetchLink className='ui-button' data-variant='ghost' href={firstEvidenceHref} smartPrefetch='hover'>
            Abrir 1a evidencia
          </PrefetchLink>
        ) : null}
        <ShareButton url={shareUrl} title='Thread do Debate' text='Debate com evidencias no Cadernos Vivos' />
        <SaveToNotebookButton
          universeSlug={slug}
          kind='highlight'
          title={`Thread: ${question}`}
          text={`${question}\n\n${clip(answer, 520)}`}
          sourceType='thread'
          sourceId={threadId}
          sourceMeta={{
            threadId,
            nodeSlug: nodeSlug || null,
            docIds: documentIds,
          }}
          label='Salvar pergunta + achado'
          compact
        />
        <AddToSharedNotebookButton
          universeSlug={slug}
          sourceType='thread'
          sourceId={threadId}
          title={`Thread: ${question}`}
          text={`${question}\n\n${clip(answer, 520)}`}
          sourceMeta={{
            threadId,
            nodeSlug: nodeSlug || null,
            docIds: documentIds,
            originalSourceType: 'thread',
            originalSourceId: threadId,
            linkToApp: `/c/${slug}/debate?selected=${threadId}&panel=detail`,
          }}
          compact
        />
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

      {citations.length > 0 ? (
        <Card className='stack'>
          <strong>Salvar citacao</strong>
          <div className='stack'>
            {citations.slice(0, 4).map((citation) => (
              <article key={citation.citationId} className='core-node stack'>
                <p className='muted' style={{ margin: 0 }}>
                  {citation.docTitle} {citation.year ? `(${citation.year})` : ''} | p.{citation.pageStart ?? citation.pageEnd ?? 's/p'}
                </p>
                <p style={{ margin: 0 }}>{clip(citation.quote, 180)}</p>
                <SaveToNotebookButton
                  universeSlug={slug}
                  kind='highlight'
                  title={`Citacao: ${citation.docTitle}`}
                  text={citation.quote}
                  sourceType='citation'
                  sourceId={citation.citationId}
                  sourceMeta={{
                    citationId: citation.citationId,
                    threadId: citation.threadId,
                    docId: citation.docId,
                    pageStart: citation.pageStart,
                    pageEnd: citation.pageEnd,
                  }}
                  label='Salvar citacao'
                  compact
                />
              </article>
            ))}
          </div>
        </Card>
      ) : null}

      {result ? (
        <Card className='stack' role='status' aria-live='polite'>
          <strong>Resultado do follow-up</strong>
          {result.confidence ? (
            <p className='muted' style={{ margin: 0 }}>
              Confianca: {result.confidence.label} ({result.confidence.score}/100)
            </p>
          ) : null}
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.answer}</p>
          {result.insufficientReason ? (
            <p className='muted' style={{ margin: 0 }}>
              Limite: {result.insufficientReason}
            </p>
          ) : null}
          {result.limitations && result.limitations.length > 0 ? (
            <div className='stack'>
              <strong>Limitacoes</strong>
              {result.limitations.slice(0, 4).map((item, index) => (
                <p key={`followup-limit-${index}`} className='muted' style={{ margin: 0 }}>
                  - {item}
                </p>
              ))}
            </div>
          ) : null}
          {result.divergence?.flag ? (
            <p className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>
              Divergencia: {result.divergence.summary ?? 'Ha sinais de resultados divergentes ou inconclusivos entre fontes.'}
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

