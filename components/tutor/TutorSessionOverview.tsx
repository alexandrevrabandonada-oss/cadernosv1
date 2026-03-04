'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  status: 'todo' | 'done';
  completedAt: string | null;
  lastThreadId: string | null;
};

type TutorSessionOverviewProps = {
  slug: string;
  sessionId: string;
  mode: 'visitor' | 'logged';
  points: TutorPoint[];
  currentIndex: number;
  onSetCurrentIndex: (sessionId: string, index: number) => Promise<{ ok: boolean } | void>;
};

export function TutorSessionOverview({
  slug,
  sessionId,
  mode,
  points,
  currentIndex,
  onSetCurrentIndex,
}: TutorSessionOverviewProps) {
  const router = useRouter();
  const tutor = useTutorSession({
    slug,
    sessionId,
    mode,
    points,
    currentIndex,
    onSetCurrentIndex,
  });

  async function continueSession() {
    const next = Math.max(0, Math.min(tutor.currentIndex, Math.max(0, points.length - 1)));
    router.push(`/c/${slug}/tutor/s/${sessionId}/p/${next}`);
  }

  function resetVisitor() {
    if (mode !== 'visitor') return;
    localStorage.removeItem(`cv:tutor-v1:${slug}:${sessionId}`);
    window.location.reload();
  }

  return (
    <div className='stack'>
      <div className='toolbar-row'>
        <Carimbo>{`progresso:${tutor.completedCount}/${tutor.total}`}</Carimbo>
        <button className='ui-button' type='button' onClick={() => void continueSession()}>
          Continuar
        </button>
        {mode === 'visitor' ? (
          <button className='ui-button' type='button' data-variant='ghost' onClick={resetVisitor}>
            Reiniciar (visitante)
          </button>
        ) : null}
      </div>
      <div className='stack'>
        {points.map((point) => (
          <article key={point.id} className='core-node'>
            <div className='toolbar-row'>
              <strong>
                {point.orderIndex + 1}. {point.title}
              </strong>
              <Carimbo>{tutor.stateByPoint[point.id]?.done || point.status === 'done' ? 'done' : 'todo'}</Carimbo>
            </div>
            <p style={{ margin: 0 }}>{point.goal}</p>
            <div className='toolbar-row'>
              <Link className='ui-button' data-variant='ghost' href={`/c/${slug}/tutor/s/${sessionId}/p/${point.orderIndex}`}>
                Abrir ponto
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
