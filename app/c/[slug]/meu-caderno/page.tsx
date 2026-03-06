import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Card } from '@/components/ui/Card';
import { Portais } from '@/components/universe/Portais';
import { MyNotebookWorkspace } from '@/components/notes/MyNotebookWorkspace';
import { parseCadernoFilters } from '@/lib/filters/cadernoFilters';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { buildUniverseHref } from '@/lib/universeNav';

type MeuCadernoPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MeuCadernoPage({ params, searchParams }: MeuCadernoPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, 'meu-caderno');
  const access = await getUniverseAccessBySlug(slug);
  if (!access.universe) notFound();
  if (!access.published && !access.canPreview) notFound();
  const filters = parseCadernoFilters(await searchParams);

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Meu Caderno' />
      <MyNotebookWorkspace slug={slug} title={access.universe.title} filters={filters} isPublished={access.published} />
      <Card className='stack'>
        <Portais slug={slug} currentPath='meu-caderno' title='Proximas portas' />
      </Card>
    </div>
  );
}

