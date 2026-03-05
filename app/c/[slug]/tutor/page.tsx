import { redirect } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TutorModePanel } from '@/components/tutor/TutorModePanel';
import { createTutorSession, getTutorPlanPreview, getTutorSession, setTutorCurrentIndex } from '@/app/actions/tutor';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseContextBySlug } from '@/lib/data/debate';
import { getUniverseMock } from '@/lib/mock/universe';
import { buildUniverseHref } from '@/lib/universeNav';

type TutorModePageProps = {
  params: Promise<{ slug: string }>;
};

async function startTutorSessionAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') ?? '').trim();
  if (!slug) return;
  const result = await createTutorSession(slug);
  if (!result.ok || !result.sessionId) return;
  redirect(`/c/${slug}/tutor/s/${result.sessionId}`);
}

export default async function TutorModePage({ params }: TutorModePageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, 'tutor');
  const universe = await getUniverseContextBySlug(slug);
  const fallback = getUniverseMock(slug);
  const title = universe?.title ?? fallback.title;
  const session = await getCurrentSession();
  const isLoggedIn = Boolean(session && session.userId !== 'dev-bypass');

  const activeSession = isLoggedIn ? await getTutorSession(slug) : null;
  const preview = await getTutorPlanPreview(slug);
  const points = activeSession?.points ?? preview;

  async function setCurrentIndexAction(sessionId: string, index: number) {
    'use server';
    return setTutorCurrentIndex(sessionId, index);
  }

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Tutor' />

      <Card className='stack'>
        <SectionHeader
          title={`Tutor Mode: ${title}`}
          description='Sessao de estudo guiada por pontos, evidencias e checkpoints.'
          tag='Tutor v1'
        />
        {isLoggedIn ? (
          <form action={startTutorSessionAction}>
            <input type='hidden' name='slug' value={slug} />
            <button className='ui-button' type='submit'>
              {activeSession ? 'Sessao ativa' : 'Iniciar sessao'}
            </button>
          </form>
        ) : null}
      </Card>

      <Card className='stack'>
        <TutorModePanel
          slug={slug}
          isLoggedIn={isLoggedIn}
          points={points}
          hasSession={Boolean(activeSession)}
          sessionId={activeSession?.id ?? 'local'}
          currentIndex={activeSession?.currentIndex ?? 0}
          onSetCurrentIndex={setCurrentIndexAction}
        />
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='tutor' title='Proximas portas' />
      </Card>
    </div>
  );
}
