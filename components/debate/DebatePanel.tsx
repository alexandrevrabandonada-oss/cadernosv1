'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';

type AskCitation = {
  citationId: string | null;
  threadId: string | null;
  docId: string;
  chunkId: string;
  doc: string;
  year: number | null;
  pages: string;
  pageStart: number | null;
  pageEnd: number | null;
  quote: string;
  quoteStart: number | null;
  quoteEnd: number | null;
  highlightToken: string | null;
};

type AskResponse = {
  answer: string;
  mode?: 'strict_ok' | 'insufficient';
  insufficient?: boolean;
  insufficientReason?: string | null;
  suggestions?: string[];
  threadId?: string | null;
  citations: AskCitation[];
};

type RecentQuestion = {
  id: string;
  question: string;
  createdAt: string;
};

type DebatePanelProps = {
  slug: string;
  universeId: string | null;
  recent: RecentQuestion[];
  initialQuestion?: string;
  initialNodeSlug?: string;
  backUrl?: string;
  showRecent?: boolean;
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

export function DebatePanel({
  slug,
  universeId,
  recent,
  initialQuestion = '',
  initialNodeSlug = '',
  backUrl = '',
  showRecent = true,
}: DebatePanelProps) {
  const questionInputId = `ask-question-${slug}`;
  const hintId = `ask-question-hint-${slug}`;
  const [question, setQuestion] = useState(initialQuestion);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RecentQuestion[]>(recent);
  const [nodeSlug] = useState(initialNodeSlug.trim());
  const autoAskedRef = useRef(false);
  const quickHistoryKey = `cv:quick-asks:${slug}`;

  const terms = useMemo(
    () =>
      question
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length >= 4)
        .slice(0, 8),
    [question],
  );

  const answerSections = useMemo(() => {
    if (!result?.answer) return [] as Array<{ title: string; lines: string[] }>;
    const lines = result.answer.split('\n');
    const sections: Array<{ title: string; lines: string[] }> = [];
    let current: { title: string; lines: string[] } | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('## ')) {
        if (current) sections.push(current);
        current = { title: line.replace(/^##\s+/, ''), lines: [] };
        continue;
      }
      if (!current) continue;
      if (line) current.lines.push(line);
    }
    if (current) sections.push(current);
    return sections;
  }, [result?.answer]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(quickHistoryKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentQuestion[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setHistory((current) => {
        const merged = [...parsed, ...current];
        const seen = new Set<string>();
        return merged
          .filter((item) => {
            const key = item.question.trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 8);
      });
    } catch {
      // noop
    }
  }, [quickHistoryKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(quickHistoryKey, JSON.stringify(history.slice(0, 8)));
    } catch {
      // noop
    }
  }, [history, quickHistoryKey]);

  const askQuestion = useCallback(async (inputQuestion: string) => {
    const clean = inputQuestion.trim();
    if (clean.length < 8) {
      setError('Escreva uma pergunta com mais contexto (minimo de 8 caracteres).');
      return false;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universeSlug: slug, question: clean, nodeSlug: nodeSlug || undefined }),
      });

      const data = (await response.json()) as AskResponse & { message?: string; retryAfterSec?: number; error?: string };
      if (!response.ok) {
        if (response.status === 429 && data.error === 'rate_limited') {
          throw new Error(`Muitas perguntas em pouco tempo. Tente novamente em ${data.retryAfterSec ?? 1}s.`);
        }
        throw new Error(data.message || 'Falha ao consultar o endpoint /api/ask.');
      }

      setResult({
        answer: data.answer,
        mode: data.mode,
        insufficient: data.insufficient,
        insufficientReason: data.insufficientReason ?? null,
        suggestions: data.suggestions ?? [],
        threadId: data.threadId ?? null,
        citations: data.citations ?? [],
      });
      setHistory((current) => {
        const next = [{ id: `tmp-${Date.now()}`, question: clean, createdAt: new Date().toISOString() }, ...current];
        return next.slice(0, 8);
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [nodeSlug, slug]);

  useEffect(() => {
    const preset = initialQuestion.trim();
    if (!preset || autoAskedRef.current) return;
    autoAskedRef.current = true;
    const timer = window.setTimeout(() => {
      void askQuestion(preset);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [askQuestion, initialQuestion]);

  async function onAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await askQuestion(question);
  }

  return (
    <div className='stack'>
      <Card className='stack'>
        <SectionHeader title='Pergunta de debate' description='Envie uma pergunta e recupere resposta com evidencias citadas.' />
        {backUrl ? (
          <div className='toolbar-row'>
            <Link className='ui-button' data-variant='ghost' href={backUrl}>
              Voltar para trilha
            </Link>
          </div>
        ) : null}
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
          {nodeSlug ? (
            <p className='muted' style={{ margin: 0 }}>
              Contexto de no ativo: <strong>{nodeSlug}</strong> (boost documental aplicado quando houver vinculos).
            </p>
          ) : null}
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
          <div className='stack'>
            {answerSections.length > 0 ? (
              answerSections.map((section) => (
                <article key={section.title} className='core-node'>
                  <strong>{section.title}</strong>
                  <div className='stack'>
                    {section.lines.map((line, index) => (
                      <p key={`${section.title}-${index}`} style={{ margin: 0 }}>
                        {line}
                      </p>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.answer}</p>
            )}
          </div>
          {result.mode === 'insufficient' ? (
            <article className='core-node'>
              <strong>O que falta na base</strong>
              <p className='muted' style={{ margin: 0 }}>
                {result.insufficientReason ?? 'Evidencia insuficiente para concluir em modo estrito.'}
              </p>
              {result.suggestions && result.suggestions.length > 0 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Sugestoes: {result.suggestions.join('; ')}
                </p>
              ) : null}
            </article>
          ) : null}

          <SectionHeader title='Evidencias' description='Trechos usados para fundamentar a resposta.' />
          {result.threadId && universeId ? (
            <GenerateExportButton
              endpoint='/api/admin/export/thread'
              label='Gerar Dossie (MD+PDF)'
              payload={{ universeId, threadId: result.threadId, isPublic: false }}
            />
          ) : (
            <p className='muted' style={{ margin: 0 }}>
              Export disponivel quando a thread estiver persistida no banco.
            </p>
          )}
          <div className='stack'>
            {result.citations.map((citation, index) => (
              <article key={citation.citationId ?? `${citation.chunkId}-${index}`} className='core-node'>
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
                    href={`/c/${slug}/doc/${citation.docId}?p=${citation.pageStart ?? citation.pageEnd ?? ''}&thread=${
                      citation.threadId ?? result.threadId ?? ''
                    }&cite=${citation.citationId ?? ''}`}
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

      {showRecent ? (
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
      ) : null}
    </div>
  );
}
