'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Carimbo } from '@/components/ui/Badge';
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
};

type TutorModePanelProps = {
  slug: string;
  isLoggedIn: boolean;
  points: TutorPoint[];
  hasSession: boolean;
  sessionId: string;
  currentIndex: number;
  onSetCurrentIndex: (sessionId: string, index: number) => Promise<{ ok: boolean } | void>;
};

function visitorKey(slug: string) {
  return `cv:tutor-session:${slug}`;
}

export function TutorModePanel({
  slug,
  isLoggedIn,
  points,
  hasSession,
  sessionId,
  currentIndex,
  onSetCurrentIndex,
}: TutorModePanelProps) {
  const [visitorStarted, setVisitorStarted] = useState(false);
  const mode = isLoggedIn ? 'logged' : 'visitor';
  const tutor = useTutorSession({
    slug,
    sessionId,
    mode,
    points,
    currentIndex,
    onSetCurrentIndex,
  });

  useEffect(() => {
    if (isLoggedIn) return;
    try {
      const raw = localStorage.getItem(visitorKey(slug));
      const value = raw ? (JSON.parse(raw) as { started: boolean }) : null;
      setVisitorStarted(Boolean(value?.started));
    } catch {
      setVisitorStarted(false);
    }
  }, [isLoggedIn, slug]);

  function startVisitor() {
    try {
      localStorage.setItem(visitorKey(slug), JSON.stringify({ started: true, createdAt: new Date().toISOString() }));
    } catch {
      // noop
    }
    setVisitorStarted(true);
  }

  const startHref = `/c/${slug}/tutor/s/${sessionId}/p/${tutor.currentIndex}`;

  return (
    <div className='stack'>
      <div className='toolbar-row'>
        <Carimbo>{`pontos:${points.length}`}</Carimbo>
        <Carimbo>{`progresso:${tutor.completedCount}/${tutor.total}`}</Carimbo>
        <Carimbo>{isLoggedIn ? 'modo:logado' : 'modo:visitante'}</Carimbo>
      </div>

      {!isLoggedIn ? (
        <div className='toolbar-row'>
          <button className='ui-button' type='button' onClick={startVisitor}>
            {visitorStarted ? 'Sessao visitante ativa' : 'Iniciar sessao visitante'}
          </button>
          <Link className='ui-button' data-variant='ghost' href='/login?next=/admin'>
            Entrar para salvar no Supabase
          </Link>
        </div>
      ) : null}

      {isLoggedIn && !hasSession ? (
        <p className='muted' style={{ margin: 0 }}>
          Clique em &quot;Iniciar sessao&quot; para persistir este plano.
        </p>
      ) : null}

      <div className='stack'>
        {points.map((point, index) => (
          <article key={point.id} className='core-node tutor-panel-card'>
            <strong>
              {index + 1}. {point.title}
            </strong>
            <p style={{ margin: 0 }}>{point.goal}</p>
            <p className='muted' style={{ margin: 0 }}>
              evidencias: {point.requiredEvidenceIds.length} | perguntas: {point.guidedQuestions.length}
            </p>
            {point.guidedQuestions.length > 0 ? (
              <p className='muted' style={{ margin: 0 }}>
                Pergunta inicial: {point.guidedQuestions[0]}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <div className='toolbar-row'>
        <Link className='ui-button' href={`/c/${slug}/tutor/s/${sessionId}`}>
          Abrir sessao
        </Link>
        <Link className='ui-button' data-variant='ghost' href={startHref}>
          Comecar
        </Link>
      </div>
    </div>
  );
}
