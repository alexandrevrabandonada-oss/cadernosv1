'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';
import { SaveToNotebookButton } from '@/components/notes/SaveToNotebookButton';
import { AddToSharedNotebookButton } from '@/components/shared-notebooks/AddToSharedNotebookButton';
import { Carimbo } from '@/components/ui/Badge';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { useStudyTracker } from '@/hooks/useStudyTracker';
import { feedback } from '@/lib/feedback/feedback';
import { useTutorSession } from '@/hooks/useTutorSession';

type TutorPoint = {
  id: string;
  orderIndex: number;
  nodeId: string | null;
  nodeSlug: string | null;
  title: string;
  goal: string;
  requiredEvidenceIds: string[];
  guidedQuestions: string[];
  status: 'todo' | 'done';
  completedAt: string | null;
  lastThreadId: string | null;
};

type TutorEvidence = {
  id: string;
  title: string;
  summary: string;
  documentId: string | null;
  pageStart: number | null;
  pageEnd: number | null;
};

type AskCitation = {
  citationId: string | null;
  threadId: string | null;
  docId: string;
  chunkId?: string;
  doc: string;
  year: number | null;
  pages: string;
  pageStart?: number | null;
  quote: string;
};

type AskResponse = {
  answer: string;
  mode?: 'strict_ok' | 'insufficient';
  insufficient?: boolean;
  insufficientReason?: string | null;
  suggestions?: string[];
  threadId?: string | null;
  confidence?: { score: number; label: 'forte' | 'media' | 'fraca' } | null;
  limitations?: string[];
  divergence?: { flag: boolean; summary: string | null } | null;
  citations: AskCitation[];
};

type TutorPointLabProps = {
  slug: string;
  universeId: string;
  sessionId: string;
  mode: 'visitor' | 'logged';
  canExportClip: boolean;
  points: TutorPoint[];
  initialIndex: number;
  evidenceMap: Record<string, TutorEvidence>;
  initialChatThreadId?: string | null;
  initialChatMessages?: Array<{
    id: string;
    role: 'user' | 'tutor';
    text: string;
    qaThreadId: string | null;
    createdAt: string;
  }>;
  onSetCurrentIndex: (sessionId: string, index: number) => Promise<{ ok: boolean } | void>;
  onMarkDone: (
    sessionId: string,
    orderIndex: number,
    options: { threadId?: string | null },
  ) => Promise<{ ok: boolean; done?: boolean; nextIndex?: number } | void>;
  onSendChatMessage: (payload: {
    sessionId: string;
    pointId: string;
    text: string;
  }) => Promise<
    | {
        ok: true;
        threadId: string;
        answer: string;
        citations: AskCitation[];
        qaThreadId: string | null;
        insufficient: boolean;
        insufficientReason: string | null;
        suggestions: string[];
        confidence: { score: number; label: 'forte' | 'media' | 'fraca' } | null;
        limitations: string[];
        divergence: { flag: boolean; summary: string | null };
      }
    | { ok: false; reason: string; status?: number }
  >;
};

type TutorChatMessage = {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  citations?: AskCitation[];
  qaThreadId?: string | null;
  confidence?: { score: number; label: 'forte' | 'media' | 'fraca' } | null;
  limitations?: string[];
  divergence?: { flag: boolean; summary: string | null } | null;
};

function chatStorageKey(slug: string, sessionId: string, pointId: string) {
  return `cv:tutor-chat-v1:${slug}:${sessionId}:${pointId}`;
}

function pointHref(slug: string, sessionId: string, point: Pick<TutorPoint, 'orderIndex'>) {
  return `/c/${slug}/tutor/s/${sessionId}/p/${point.orderIndex}`;
}

export function TutorPointLab({
  slug,
  universeId,
  sessionId,
  mode,
  canExportClip,
  points,
  initialIndex,
  evidenceMap,
  initialChatThreadId,
  initialChatMessages = [],
  onSetCurrentIndex,
  onMarkDone,
  onSendChatMessage,
}: TutorPointLabProps) {
  const router = useRouter();
  const [question, setQuestion] = useState(points[initialIndex]?.guidedQuestions[0] ?? '');
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatThreadId, setChatThreadId] = useState<string | null>(initialChatThreadId ?? null);
  const [chatMessages, setChatMessages] = useState<TutorChatMessage[]>(
    initialChatMessages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
      qaThreadId: message.qaThreadId,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const prefs = useUiPrefsContext();
  const { trackAction } = useStudyTracker();

  const tutor = useTutorSession({
    slug,
    sessionId,
    mode,
    points,
    currentIndex: initialIndex,
    onSetCurrentIndex,
    onMarkDone,
  });

  const point = tutor.currentPoint ?? points[initialIndex] ?? null;
  const checks = point ? tutor.canCompletePoint(point) : { evidenceOk: false, questionOk: false, canComplete: false };
  const requiredEvidences = useMemo(
    () => (point ? point.requiredEvidenceIds.map((id) => evidenceMap[id]).filter(Boolean) : []),
    [evidenceMap, point],
  );
  const scopedDocumentIds = useMemo(
    () => Array.from(new Set(requiredEvidences.map((item) => item.documentId).filter((id): id is string => Boolean(id)))),
    [requiredEvidences],
  );

  useEffect(() => {
    if (!point) return;
    trackAction({
      action: 'tutor_point_open',
      item: {
        type: 'tutor',
        id: point.id,
        label: point.title,
        href: pointHref(slug, sessionId, point),
        nodeSlug: point.nodeSlug ?? null,
      },
      lastSection: 'tutor',
    });
  }, [point, sessionId, slug, trackAction]);

  useEffect(() => {
    if (!point) return;
    if (mode === 'logged') {
      setChatMessages(
        initialChatMessages.map((message) => ({
          id: message.id,
          role: message.role,
          text: message.text,
          qaThreadId: message.qaThreadId,
        })),
      );
      setChatThreadId(initialChatThreadId ?? null);
      return;
    }
    try {
      const raw = localStorage.getItem(chatStorageKey(slug, sessionId, point.id));
      if (!raw) {
        setChatMessages([]);
        return;
      }
      const parsed = JSON.parse(raw) as { threadId?: string | null; messages?: TutorChatMessage[] };
      setChatThreadId(parsed.threadId ?? null);
      setChatMessages(parsed.messages ?? []);
    } catch {
      setChatMessages([]);
    }
  }, [initialChatMessages, initialChatThreadId, mode, point, sessionId, slug]);

  useEffect(() => {
    if (!point || mode !== 'visitor') return;
    try {
      localStorage.setItem(
        chatStorageKey(slug, sessionId, point.id),
        JSON.stringify({ threadId: chatThreadId, messages: chatMessages.slice(-60) }),
      );
    } catch {
      // noop
    }
  }, [chatMessages, chatThreadId, mode, point, sessionId, slug]);

  async function askGuidedQuestion() {
    if (!point) return;
    const payloadQuestion = question.trim() || point.guidedQuestions[0] || '';
    if (payloadQuestion.length < 8) {
      setError('Pergunta guiada muito curta.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universeSlug: slug,
          question: payloadQuestion,
          nodeSlug: point.nodeSlug ?? undefined,
          source: 'guided',
          scope: {
            mode: 'tutor',
            requiredEvidenceIds: point.requiredEvidenceIds,
            documentIds: scopedDocumentIds,
          },
        }),
      });
      const data = (await response.json()) as AskResponse & { message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Falha ao consultar o tutor.');
      setResult(data);
      tutor.markAsked(point.id, data.threadId ?? null);
      trackAction({
        action: 'tutor_ask',
        item: {
          type: 'tutor',
          id: point.id,
          label: point.title,
          href: data.threadId ? `/c/${slug}/debate?selected=${data.threadId}&panel=detail` : pointHref(slug, sessionId, point),
          nodeSlug: point.nodeSlug ?? null,
        },
        lastSection: 'tutor',
      });
      feedback('success', prefs?.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
      feedback('warning', prefs?.settings);
    } finally {
      setLoading(false);
    }
  }

  async function sendChat() {
    if (!point) return;
    const text = chatInput.trim();
    if (text.length < 4 || text.length > 500) {
      setError('Mensagem deve ter entre 4 e 500 caracteres.');
      return;
    }
    setChatLoading(true);
    setError(null);
    const userMessage: TutorChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    setChatMessages((current) => [...current, userMessage]);
    setChatInput('');

    try {
      if (mode === 'logged') {
        const response = await onSendChatMessage({ sessionId, pointId: point.id, text });
        if (!response.ok) throw new Error(response.reason);
        setChatThreadId(response.threadId);
        const tutorMessage: TutorChatMessage = {
          id: `t-${Date.now()}`,
          role: 'tutor',
          text: response.answer,
          citations: response.citations,
          qaThreadId: response.qaThreadId,
          confidence: response.confidence,
          limitations: response.limitations,
          divergence: response.divergence,
        };
        setChatMessages((current) => [...current, tutorMessage]);
        trackAction({
          action: 'tutor_ask',
          item: {
            type: 'tutor',
            id: point.id,
            label: point.title,
            href: `/c/${slug}/debate?selected=${response.threadId}&panel=detail`,
            nodeSlug: point.nodeSlug ?? null,
          },
          lastSection: 'tutor',
        });
        feedback('success', prefs?.settings);
      } else {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            universeSlug: slug,
            question: text,
            nodeSlug: point.nodeSlug ?? undefined,
            source: 'tutor_chat',
            scope: {
              mode: 'tutor',
              requiredEvidenceIds: point.requiredEvidenceIds,
              documentIds: scopedDocumentIds,
            },
          }),
        });
        const data = (await response.json()) as AskResponse & { message?: string };
        if (!response.ok) throw new Error(data.message ?? 'Falha no tutor chat.');
        const tutorMessage: TutorChatMessage = {
          id: `t-${Date.now()}`,
          role: 'tutor',
          text: data.answer,
          citations: data.citations ?? [],
          qaThreadId: data.threadId ?? null,
          confidence: data.confidence ?? null,
          limitations: data.limitations ?? [],
          divergence: data.divergence ?? { flag: false, summary: null },
        };
        setChatThreadId(data.threadId ?? chatThreadId);
        setChatMessages((current) => [...current, tutorMessage]);
        trackAction({
          action: 'tutor_ask',
          item: {
            type: 'tutor',
            id: point.id,
            label: point.title,
            href: data.threadId ? `/c/${slug}/debate?selected=${data.threadId}&panel=detail` : pointHref(slug, sessionId, point),
            nodeSlug: point.nodeSlug ?? null,
          },
          lastSection: 'tutor',
        });
        feedback('success', prefs?.settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no tutor chat.');
      feedback('warning', prefs?.settings);
    } finally {
      setChatLoading(false);
    }
  }

  async function completeCurrentPoint() {
    if (!point) return;
    const done = await tutor.completePoint(point);
    if (!done.ok) return;
    feedback('success', prefs?.settings);
    const last = point.orderIndex >= points.length - 1;
    if (last || done.doneSession) {
      router.push(`/c/${slug}/tutor/s/${sessionId}/done`);
      return;
    }
    const next = Math.min(point.orderIndex + 1, points.length - 1);
    router.push(`/c/${slug}/tutor/s/${sessionId}/p/${next}`);
  }

  if (!point) {
    return (
      <div className='stack'>
        <p className='muted' style={{ margin: 0 }}>
          Ponto nao encontrado nesta sessao.
        </p>
      </div>
    );
  }

  return (
    <div className='stack tutor-focus-shell'>
      <div className='toolbar-row'>
        <Carimbo>{`progresso:${tutor.completedCount}/${tutor.total}`}</Carimbo>
        <Carimbo>{`ponto:${point.orderIndex + 1}/${points.length}`}</Carimbo>
      </div>

      <article className='core-node stack tutor-panel-card'>
        <strong>{point.title}</strong>
        <p style={{ margin: 0 }}>{point.goal}</p>
      </article>

      {requiredEvidences.length > 0 ? (
        <section className='stack tutor-focus-reading'>
          <strong>Evidencias obrigatorias</strong>
          {requiredEvidences.map((evidence) => (
            <article key={evidence.id} className='core-node tutor-panel-card'>
              <strong>{evidence.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {evidence.summary}
              </p>
              <div className='toolbar-row'>
                <Link
                  className='ui-button'
                  href={
                    evidence.documentId
                      ? `/c/${slug}/doc/${evidence.documentId}${evidence.pageStart ? `?p=${evidence.pageStart}` : ''}`
                      : `/c/${slug}/provas`
                  }
                  target='_blank'
                  onClick={() => {
                    tutor.markEvidenceOpened(point.id, evidence.id);
                    feedback('tap', prefs?.settings);
                  }}
                >
                  Abrir evidencia
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {point.guidedQuestions.length > 0 ? (
        <section className='stack tutor-focus-reading'>
          <strong>Pergunta guiada</strong>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} style={{ width: '100%' }} />
          <div className='toolbar-row'>
            <button className='ui-button' type='button' onClick={() => void askGuidedQuestion()} disabled={loading}>
              {loading ? 'Perguntando...' : 'Perguntar'}
            </button>
          </div>
          {error ? (
            <p role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
              {error}
            </p>
          ) : null}
          {result ? (
            <article className='core-node stack tutor-panel-card'>
              <strong>Resposta</strong>
              {result.confidence ? (
                <p className='muted' style={{ margin: 0 }}>
                  Confianca: {result.confidence.label} ({result.confidence.score}/100)
                </p>
              ) : null}
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.answer}</p>
              {result.limitations && result.limitations.length > 0 ? (
                <details>
                  <summary>Limitacoes</summary>
                  <div className='stack'>
                    {result.limitations.slice(0, 4).map((item, index) => (
                      <p key={`guided-limit-${index}`} className='muted' style={{ margin: 0 }}>
                        - {item}
                      </p>
                    ))}
                  </div>
                </details>
              ) : null}
              {result.divergence?.flag ? (
                <p className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>
                  Divergencia: {result.divergence.summary ?? 'Ha sinais de conflito entre fontes.'}
                </p>
              ) : null}
              {result.citations?.slice(0, 3).map((citation, idx) => (
                <p key={`${citation.docId}-${idx}`} className='muted' style={{ margin: 0 }}>
                  {citation.doc} {citation.year ? `(${citation.year})` : ''} | {citation.pages}
                </p>
              ))}
              {canExportClip && result.threadId ? (
                <div className='focus-only toolbar-row'>
                  <SaveToNotebookButton
                    universeSlug={slug}
                    kind='highlight'
                    title={`Tutor: ${point.title}`}
                    text={result.answer}
                    sourceType='thread'
                    sourceId={result.threadId}
                    sourceMeta={{
                      threadId: result.threadId,
                      nodeSlug: point.nodeSlug ?? null,
                      confidence: result.confidence ?? null,
                      divergence: result.divergence ?? null,
                    }}
                    tags={[...(point.nodeSlug ? [point.nodeSlug] : []), 'tutor']}
                    label='Salvar resposta'
                    compact
                  />
                  <AddToSharedNotebookButton
                    universeSlug={slug}
                    sourceType='thread'
                    sourceId={result.threadId}
                    title={`Tutor: ${point.title}`}
                    text={result.answer}
                    sourceMeta={{
                      threadId: result.threadId,
                      nodeSlug: point.nodeSlug ?? null,
                      originalSourceType: 'thread',
                      originalSourceId: result.threadId,
                      linkToApp: result.threadId ? `/c/${slug}/debate?selected=${result.threadId}&panel=detail` : pointHref(slug, sessionId, point),
                    }}
                    tags={[...(point.nodeSlug ? [point.nodeSlug] : []), 'tutor']}
                    compact
                  />
                  <GenerateExportButton
                    endpoint='/api/admin/export/clip'
                    label='Exportar trecho'
                    payload={{
                      universeId,
                      sourceType: 'thread',
                      sourceId: result.threadId,
                      title: `Clip tutor: ${point.title}`,
                      snippet: result.answer,
                      isPublic: false,
                    }}
                  />
                </div>
              ) : null}
            </article>
          ) : null}
        </section>
      ) : null}

      <section className='stack tutor-chat-block'>
        <strong>Tutor Chat</strong>
        <p className='muted' style={{ margin: 0 }}>
          Pergunte ao tutor sobre este ponto (escopo: evidencias obrigatorias e docs do no).
        </p>
        <div className='stack'>
          {chatMessages.map((message) => (
            <article key={message.id} className='core-node stack tutor-panel-card'>
              <div className='toolbar-row'>
                <Carimbo>{message.role === 'user' ? 'voce' : 'tutor'}</Carimbo>
                {message.qaThreadId ? (
                  <Link className='ui-button' data-variant='ghost' href={`/c/${slug}/debate`}>
                    ver thread
                  </Link>
                ) : null}
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.text}</p>
              {message.confidence ? (
                <p className='muted' style={{ margin: 0 }}>
                  Confianca: {message.confidence.label} ({message.confidence.score}/100)
                </p>
              ) : null}
              {message.limitations && message.limitations.length > 0 ? (
                <details>
                  <summary>Limitacoes</summary>
                  <div className='stack'>
                    {message.limitations.slice(0, 4).map((item, idx) => (
                      <p key={`${message.id}-lim-${idx}`} className='muted' style={{ margin: 0 }}>
                        - {item}
                      </p>
                    ))}
                  </div>
                </details>
              ) : null}
              {message.divergence?.flag ? (
                <p className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>
                  Divergencia: {message.divergence.summary ?? 'Ha sinais de conflito entre fontes.'}
                </p>
              ) : null}
              {message.citations && message.citations.length > 0 ? (
                <div className='stack'>
                  {message.citations.slice(0, 3).map((citation, idx) => (
                    <article key={`${message.id}-${idx}`} className='core-node tutor-panel-card'>
                      <p className='muted' style={{ margin: 0 }}>
                        {citation.doc} {citation.year ? `(${citation.year})` : ''} | {citation.pages}
                      </p>
                      <p style={{ margin: 0 }}>{citation.quote}</p>
                      {citation.docId ? (
                        <Link
                          className='ui-button'
                          data-variant='ghost'
                          href={`/c/${slug}/doc/${citation.docId}${citation.pageStart ? `?p=${citation.pageStart}` : ''}`}
                          target='_blank'
                        >
                          ver no doc
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {chatMessages.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem mensagens ainda.
            </p>
          ) : null}
        </div>
        <textarea
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          rows={3}
          maxLength={500}
          aria-label='Pergunte ao tutor sobre este ponto'
        />
        <div className='toolbar-row'>
          <button className='ui-button' type='button' onClick={() => void sendChat()} disabled={chatLoading}>
            {chatLoading ? 'Enviando...' : 'Enviar ao tutor'}
          </button>
          <Carimbo>{`thread:${chatThreadId ? 'ok' : 'local'}`}</Carimbo>
        </div>
      </section>

      <section className='stack'>
        <strong>Checkpoint</strong>
        <p className='muted' style={{ margin: 0 }}>
          Evidencias: {checks.evidenceOk ? 'ok' : 'pendente'} | Pergunta: {checks.questionOk ? 'ok' : 'pendente'}
        </p>
        <div className='toolbar-row'>
          <button className='ui-button' type='button' disabled={!checks.canComplete} onClick={() => void completeCurrentPoint()}>
            Concluir ponto
          </button>
          {!checks.canComplete ? <Carimbo>complete as tarefas minimas</Carimbo> : null}
        </div>
      </section>
    </div>
  );
}


