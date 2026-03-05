'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Carimbo } from '@/components/ui/Badge';
import { useTrailProgress } from '@/hooks/useTrailProgress';

type TrailStep = {
  id: string;
  order: number;
  title: string;
  instruction: string;
  nodeId: string | null;
  nodeSlug: string | null;
  nodeTitle: string | null;
  evidenceId: string | null;
  evidenceTitle: string | null;
  requiredEvidenceIds: string[];
  requiredEvidences: Array<{
    id: string;
    title: string;
    summary: string;
    documentId: string | null;
    pageStart: number | null;
    pageEnd: number | null;
  }>;
  guidedQuestion: string | null;
  guidedNodeSlug: string | null;
  requiresQuestion: boolean;
};

type Trail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  steps: TrailStep[];
};

type TrailLabProps = {
  slug: string;
  universeId: string | null;
  trail: Trail;
  initialDoneStepIds: string[];
  isLoggedIn: boolean;
  onMarkDone: (input: { universeId: string; trailId: string; stepId: string }) => Promise<{ ok: boolean } | void>;
};

function askedKey(slug: string, trailId: string) {
  return `cv:trail-asked:${slug}:${trailId}`;
}

export function TrailLab({ slug, universeId, trail, initialDoneStepIds, isLoggedIn, onMarkDone }: TrailLabProps) {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(trail.steps[0]?.id ?? null);
  const [asked, setAsked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(askedKey(slug, trail.id));
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [errorByStep, setErrorByStep] = useState<Record<string, string>>({});
  const progress = useTrailProgress({
    universeSlug: slug,
    universeId,
    trailId: trail.id,
    stepIds: trail.steps.map((step) => step.id),
    initialDoneStepIds,
    isLoggedIn,
    persistStepDone: onMarkDone,
  });

  const progressPct = useMemo(
    () => (progress.total > 0 ? Math.round((progress.completedCount / progress.total) * 100) : 0),
    [progress.completedCount, progress.total],
  );

  const markAsked = (stepId: string) => {
    setAsked((current) => {
      const next = { ...current, [stepId]: true };
      try {
        localStorage.setItem(askedKey(slug, trail.id), JSON.stringify(next));
      } catch {
        // noop
      }
      return next;
    });
  };

  async function handleMarkDone(step: TrailStep) {
    if (step.requiresQuestion && !asked[step.id]) {
      setErrorByStep((current) => ({
        ...current,
        [step.id]: 'Execute a pergunta guiada antes de concluir este passo.',
      }));
      return;
    }
    setErrorByStep((current) => ({ ...current, [step.id]: '' }));
    await progress.markDone(step.id);
  }

  return (
    <div className='stack'>
      <div className='toolbar-row'>
        <Carimbo>{`progresso:${progress.completedCount}/${progress.total}`}</Carimbo>
        <Carimbo>{`${progressPct}%`}</Carimbo>
        <button className='ui-button' type='button' data-variant='ghost' onClick={progress.resetTrail}>
          Reset local
        </button>
      </div>

      <div className='stack'>
        {trail.steps.map((step) => {
          const done = progress.getStepStatus(step.id) === 'done';
          const open = expandedStepId === step.id;
          return (
            <article key={step.id} className='core-node stack trail-player-card'>
              <div className='toolbar-row'>
                <strong>
                  {step.order}. {step.title}
                </strong>
                {done ? <Carimbo>concluido</Carimbo> : <Carimbo>pendente</Carimbo>}
                <button
                  type='button'
                  className='ui-button'
                  data-variant='ghost'
                  onClick={() => setExpandedStepId(open ? null : step.id)}
                >
                  {open ? 'Recolher' : 'Abrir'}
                </button>
              </div>
              <p style={{ margin: 0 }}>{step.instruction}</p>
              {open ? (
                <div className='stack'>
                  {step.requiredEvidences.length > 0 ? (
                    <div className='stack'>
                      <strong>Leituras obrigatorias</strong>
                      {step.requiredEvidences.map((evidence) => {
                        const page = evidence.pageStart
                          ? `?p=${evidence.pageStart}`
                          : '';
                        return (
                          <article key={evidence.id} className='core-node trail-player-card'>
                            <strong>{evidence.title}</strong>
                            <p className='muted' style={{ margin: 0 }}>
                              {evidence.summary}
                            </p>
                            <div className='toolbar-row'>
                              <Link
                                className='ui-button'
                                href={
                                  evidence.documentId
                                    ? `/c/${slug}/doc/${evidence.documentId}${page}`
                                    : `/c/${slug}/provas`
                                }
                              >
                                Abrir evidencia
                              </Link>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}

                  {step.guidedQuestion ? (
                    <div className='stack'>
                      <strong>Pergunta guiada</strong>
                      <p style={{ margin: 0 }}>{step.guidedQuestion}</p>
                      <div className='toolbar-row'>
                        <Link
                          className='ui-button'
                          href={`/c/${slug}/debate?q=${encodeURIComponent(step.guidedQuestion)}${
                            step.guidedNodeSlug ? `&node=${encodeURIComponent(step.guidedNodeSlug)}` : ''
                          }&back=${encodeURIComponent(`/c/${slug}/trilhas?trail=${trail.slug}`)}`}
                          onClick={() => markAsked(step.id)}
                        >
                          Executar pergunta
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <div className='toolbar-row'>
                    <button className='ui-button' type='button' onClick={() => void handleMarkDone(step)}>
                      Marcar como concluido
                    </button>
                    {step.requiresQuestion ? (
                      <Carimbo>{asked[step.id] ? 'pergunta feita' : 'pergunta obrigatoria'}</Carimbo>
                    ) : null}
                  </div>
                  {errorByStep[step.id] ? (
                    <p role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
                      {errorByStep[step.id]}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
