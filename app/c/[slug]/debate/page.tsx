import { DebatePanel } from '@/components/debate/DebatePanel';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getRecentQuestions, getUniverseContextBySlug } from '@/lib/data/debate';
import { getUniverseMock } from '@/lib/mock/universe';
import { buildUniverseHref } from '@/lib/universeNav';

type DebatePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function DebatePage({ params, searchParams }: DebatePageProps) {
  const { slug } = await params;
  const { q } = await searchParams;
  const currentPath = buildUniverseHref(slug, 'debate');

  const universe = await getUniverseContextBySlug(slug);
  const fallback = getUniverseMock(slug);
  const title = universe?.title ?? fallback.title;
  const recent = universe ? await getRecentQuestions(universe.id, 8) : [];

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Debate' />

      <Card className='stack'>
        <SectionHeader
          title={`Debate de ${title}`}
          description='Pergunte, revise evidencias e navegue para as fontes de cada citacao.'
          tag='Debate'
        />
      </Card>

      <DebatePanel slug={slug} recent={recent} initialQuestion={q ?? ''} />

      <Card className='stack'>
        <Portais slug={slug} currentPath='debate' title='Proximas portas' />
      </Card>
    </div>
  );
}
