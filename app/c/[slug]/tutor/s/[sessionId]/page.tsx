import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TutorSessionOverview } from '@/components/tutor/TutorSessionOverview';
import { getTutorPlanPreview, getTutorSessionById, setTutorCurrentIndex, type TutorPointView } from '@/app/actions/tutor';
import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { buildUniverseHref } from '@/lib/universeNav';

type TutorSessionOverviewPageProps = {
  params: Promise<{ slug: string; sessionId: string }>;
};

async function getUniverseIdBySlug(slug: string) {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data } = await db.from('universes').select('id, title').eq('slug', slug).maybeSingle();
  return data ?? null;
}

export default async function TutorSessionOverviewPage({ params }: TutorSessionOverviewPageProps) {
  const { slug, sessionId } = await params;
  const currentPath = buildUniverseHref(slug, 'tutor');
  const session = await getCurrentSession();
  const isLoggedIn = Boolean(session && session.userId !== 'dev-bypass');
  const universe = await getUniverseIdBySlug(slug);
  if (!universe) notFound();

  let points: TutorPointView[] = [];
  let currentIndex = 0;
  let mode: 'visitor' | 'logged' = 'visitor';

  if (sessionId === 'local') {
    points = await getTutorPlanPreview(slug);
    mode = 'visitor';
  } else {
    if (!isLoggedIn) notFound();
    const tutorSession = await getTutorSessionById(sessionId);
    if (!tutorSession || tutorSession.universeId !== universe.id) notFound();
    points = tutorSession.points;
    currentIndex = tutorSession.currentIndex;
    mode = 'logged';
  }

  async function setCurrentIndexAction(targetSessionId: string, index: number) {
    'use server';
    if (targetSessionId === 'local') return { ok: true as const };
    return setTutorCurrentIndex(targetSessionId, index);
  }

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Tutor Sessao' />

      <Card className='stack'>
        <SectionHeader
          title={`Sessao de Tutor: ${universe.title}`}
          description='Visao geral do percurso, status por ponto e retomada da sessao.'
          tag='Tutor Session'
        />
      </Card>

      <Card className='stack'>
        <TutorSessionOverview
          slug={slug}
          sessionId={sessionId}
          mode={mode}
          points={points}
          currentIndex={currentIndex}
          onSetCurrentIndex={setCurrentIndexAction}
        />
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='tutor' title='Proximas portas' />
      </Card>
    </div>
  );
}
