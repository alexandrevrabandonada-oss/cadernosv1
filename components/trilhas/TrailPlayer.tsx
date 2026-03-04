'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Carimbo } from '@/components/ui/Badge';
import { useTrailProgress } from '@/hooks/useTrailProgress';
import type { TrailView } from '@/lib/data/learning';

type TrailPlayerProps = {
  slug: string;
  universeId: string | null;
  trail: TrailView;
  activeStepOrder: number;
  initialDoneStepIds: string[];
  isLoggedIn: boolean;
  onMarkDone: (input: { universeId: string; trailId: string; stepId: string }) => Promise<{ ok: boolean } | void>;
  backHref: string;
};

function askedKey(slug: string, trailId: string) {
  return `cv:trail-asked:${slug}:${trailId}`;
}

export function TrailPlayer({
  slug,
  universeId,
  trail,
  activeStepOrder,
  initialDoneStepIds,
  isLoggedIn,
  onMarkDone,
  backHref,
}: TrailPlayerProps) {
  const [asked, setAsked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(askedKey(slug, trail.id));
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [error, setError] = useState('');

  const progress = useTrailProgress({
    universeSlug: slug,
    universeId,
    trailId: trail.id,
    stepIds: trail.steps.map((step) => step.id),
    initialDoneStepIds,
    isLoggedIn,
    persistStepDone: onMarkDone,
  });

  const activeStep =
    trail.steps.find((step) => step.order === activeStepOrder) ??
    trail.steps[0] ??
    null;

  const progressPct = progress.total > 0 ? Math.round((progress.completedCount / progress.total) * 100) : 0;

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

  async function handleComplete() {
    if (!activeStep) return;
    if (activeStep.requiresQuestion && !asked[activeStep.id]) {
      setError('Execute a pergunta guiada antes de concluir este passo.');
      return;
    }
    setError('');
    await progress.markDone(activeStep.id);
  }

  if (!activeStep) {
    return (
      <p className='muted' style={{ margin: 0 }}>
        Esta trilha nao possui passos.
      </p>
    );
  }

  const done = progress.getStepStatus(activeStep.id) === 'done';

  return (
    <div className='stack'>
      <div className='toolbar-row'>
        <Carimbo>{`passo:${activeStep.order}/${trail.steps.length}`}</Carimbo>
        <Carimbo>{`progresso:${progress.completedCount}/${progress.total}`}</Carimbo>
        <Carimbo>{`${progressPct}%`}</Carimbo>
        <button className='ui-button' data-variant='ghost' type='button' onClick={progress.resetTrail}>
          Reset local
        </button>
      </div>

      <article className='core-node stack'>
        <strong>{activeStep.title}</strong>
        <p style={{ margin: 0 }}>{activeStep.instruction}</p>
        {activeStep.nodeTitle ? (
          <p className='muted' style={{ margin: 0 }}>
            Foco: {activeStep.nodeTitle}
          </p>
        ) : null}
      </article>

      {activeStep.requiredEvidences.length > 0 ? (
        <article className='core-node stack'>
          <strong>Leituras obrigatorias</strong>
          {activeStep.requiredEvidences.map((evidence) => (
            <div key={evidence.id} className='stack'>
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
                >
                  Abrir evidencia
                </Link>
              </div>
            </div>
          ))}
        </article>
      ) : null}

      {activeStep.guidedQuestion ? (
        <article className='core-node stack'>
          <strong>Pergunta guiada</strong>
          <p style={{ margin: 0 }}>{activeStep.guidedQuestion}</p>
          <div className='toolbar-row'>
            <Link
              className='ui-button'
              href={`/c/${slug}/debate?ask=${encodeURIComponent(activeStep.guidedQuestion)}${
                activeStep.guidedNodeSlug ? `&node=${encodeURIComponent(activeStep.guidedNodeSlug)}` : ''
              }&back=${encodeURIComponent(backHref)}`}
              onClick={() => markAsked(activeStep.id)}
            >
              Executar pergunta
            </Link>
            {activeStep.requiresQuestion ? (
              <Carimbo>{asked[activeStep.id] ? 'pergunta feita' : 'pergunta obrigatoria'}</Carimbo>
            ) : null}
          </div>
        </article>
      ) : null}

      <div className='toolbar-row'>
        <button className='ui-button' type='button' onClick={() => void handleComplete()}>
          {done ? 'Concluido' : 'Concluir passo'}
        </button>
      </div>
      {error ? (
        <p role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
