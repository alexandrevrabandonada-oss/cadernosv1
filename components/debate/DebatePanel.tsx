'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { SectionHeader } from '@/components/ui/SectionHeader';

type AskCitation = {
  docId: string;
  chunkId: string;
  doc: string;
  year: number | null;
  pages: string;
  pageStart: number | null;
  pageEnd: number | null;
  quote: string;
};

type AskResponse = {
  answer: string;
  citations: AskCitation[];
};

type RecentQuestion = {
  id: string;
  question: string;
  createdAt: string;
};

type DebatePanelProps = {
  slug: string;
  recent: RecentQuestion[];
  initialQuestion?: string;
};

function highlightQuote(text: string, terms: string[]) {
  if (!terms.length) return text;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!escaped) return text;
  const re = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={`${part}-${index}`} style={{ background: '#fff2a8' }}>
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

export function DebatePanel({ slug, recent, initialQuestion = '' }: DebatePanelProps) {
  const questionInputId = `ask-question-${slug}`;
  const hintId = `ask-question-hint-${slug}`;
  const [question, setQuestion] = useState(initialQuestion);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RecentQuestion[]>(recent);

  const terms = useMemo(
    () =>
      question
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length >= 4)
        .slice(0, 8),
    [question],
  );

  async function onAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = question.trim();
    if (clean.length < 8) {
      setError('Escreva uma pergunta com mais contexto (minimo de 8 caracteres).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universeSlug: slug, question: clean }),
      });

      const data = (await response.json()) as AskResponse & { message?: string };
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao consultar o endpoint /api/ask.');
      }

      setResult({ answer: data.answer, citations: data.citations ?? [] });
      setHistory((current) => {
        const next = [{ id: `tmp-${Date.now()}`, question: clean, createdAt: new Date().toISOString() }, ...current];
        return next.slice(0, 8);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='stack'>
      <Card className='stack'>
        <SectionHeader title='Pergunta de debate' description='Envie uma pergunta e recupere resposta com evidencias citadas.' />
        <form onSubmit={onAsk} className='stack' aria-busy={loading}>
          <label htmlFor={questionInputId}>
            <span>Pergunta</span>
            <textarea
              id={questionInputId}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              required
              minLength={8}
              maxLength={3000}
              placeholder='Ex.: Quais evidencias apoiam a hipotese central?'
              aria-describedby={hintId}
              style={{ width: '100%' }}
            />
          </label>
          <small id={hintId} className='muted'>
            Minimo de 8 caracteres. A resposta so conclui quando houver citacoes recuperadas.
          </small>
          <button className='ui-button' type='submit' disabled={loading}>
            {loading ? 'Consultando...' : 'Perguntar'}
          </button>
        </form>
        {error ? (
          <p role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            {error}
          </p>
        ) : null}
      </Card>

      {loading ? (
        <div role='status' aria-live='polite' aria-label='Carregando resposta'>
          <LoadingBlock />
        </div>
      ) : null}

      {result ? (
        <Card className='stack' role='status' aria-live='polite'>
          <SectionHeader title='Resposta' />
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.answer}</p>

          <SectionHeader title='Evidencias' description='Trechos usados para fundamentar a resposta.' />
          <div className='stack'>
            {result.citations.map((citation, index) => (
              <article key={`${citation.chunkId}-${index}`} className='core-node'>
                <strong>
                  {citation.doc} {citation.year ? `(${citation.year})` : ''}
                </strong>
                <p className='muted' style={{ margin: 0 }}>
                  {citation.pages}
                </p>
                <p style={{ margin: 0 }}>{highlightQuote(citation.quote, terms)}</p>
                <div className='toolbar-row'>
                  <Link
                    className='ui-button'
                    href={`/c/${slug}/doc/${citation.docId}?p=${citation.pageStart ?? citation.pageEnd ?? ''}`}
                  >
                    Ver no documento
                  </Link>
                </div>
              </article>
            ))}
            {result.citations.length === 0 ? (
              <p className='muted' style={{ margin: 0 }}>
                Nenhuma evidencia retornada para esta pergunta.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className='stack'>
        <SectionHeader title='Perguntas recentes' />
        <div className='stack'>
          {history.map((item) => (
            <article key={item.id} className='core-node'>
              <strong>{item.question}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {new Date(item.createdAt).toLocaleString('pt-BR')}
              </p>
            </article>
          ))}
          {history.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Ainda nao ha historico para este universo.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
