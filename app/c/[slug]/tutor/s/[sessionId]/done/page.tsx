import { notFound, redirect } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TutorDoneSummary } from '@/components/tutor/TutorDoneSummary';
import { getTutorPlanPreview, getTutorSessionById, type TutorPointView } from '@/app/actions/tutor';
import { getOrCreateTutorSummary, regenerateTutorSummary } from '@/app/actions/tutorSummary';
import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { buildUniverseHref } from '@/lib/universeNav';

type TutorDonePageProps = {
  params: Promise<{ slug: string; sessionId: string }>;
  searchParams: Promise<{ status?: string }>;
};

async function getUniverseBySlug(slug: string) {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data } = await db.from('universes').select('id, title').eq('slug', slug).maybeSingle();
  return data ?? null;
}

async function regenerateSummaryAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') ?? '').trim();
  const sessionId = String(formData.get('sessionId') ?? '').trim();
  if (!slug || !sessionId) return;
  await regenerateTutorSummary(sessionId);
  redirect(`/c/${slug}/tutor/s/${sessionId}/done?status=regenerated`);
}

export default async function TutorDonePage({ params, searchParams }: TutorDonePageProps) {
  const { slug, sessionId } = await params;
  const sp = await searchParams;
  const currentPath = buildUniverseHref(slug, 'tutor');
  const universe = await getUniverseBySlug(slug);
  if (!universe) notFound();

  const session = await getCurrentSession();
  const isLoggedIn = Boolean(session && session.userId !== 'dev-bypass');

  let points: TutorPointView[] = [];
  let currentIndex = 0;
  let mode: 'visitor' | 'logged' = 'visitor';
  let summary: Awaited<ReturnType<typeof getOrCreateTutorSummary>> = null;

  if (sessionId === 'local') {
    points = await getTutorPlanPreview(slug);
  } else {
    if (!isLoggedIn) notFound();
    const tutorSession = await getTutorSessionById(sessionId);
    if (!tutorSession || tutorSession.universeId !== universe.id) notFound();
    points = tutorSession.points;
    currentIndex = tutorSession.currentIndex;
    mode = 'logged';
    summary = await getOrCreateTutorSummary(sessionId);
  }
  const canExport = Boolean(session && (session.role === 'admin' || session.role === 'editor'));

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Tutor Resumo' />

      <Card className='stack'>
        <SectionHeader
          title={`Resumo final: ${universe.title}`}
          description='Consolidacao do que foi coberto na sessao de tutor e proximos passos.'
          tag='Tutor Done'
        />
      </Card>

      {sp.status === 'regenerated' ? (
        <Card>
          <p role='status' style={{ margin: 0 }}>
            Resumo regenerado.
          </p>
        </Card>
      ) : null}

      <Card className='stack'>
        <TutorDoneSummary
          slug={slug}
          universeId={universe.id}
          sessionId={sessionId}
          mode={mode}
          points={points}
          currentIndex={currentIndex}
          summary={summary}
          canExport={canExport}
        />
      </Card>

      {mode === 'logged' ? (
        <Card className='stack'>
          <form action={regenerateSummaryAction}>
            <input type='hidden' name='slug' value={slug} />
            <input type='hidden' name='sessionId' value={sessionId} />
            <button className='ui-button' type='submit' data-variant='ghost'>
              Regenerar resumo
            </button>
          </form>
        </Card>
      ) : null}

      <Card className='stack'>
        <Portais slug={slug} currentPath='tutor' title='Proximas portas' />
      </Card>
    </div>
  );
}
