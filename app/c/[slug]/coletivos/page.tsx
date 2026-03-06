import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Card } from '@/components/ui/Card';
import { Portais } from '@/components/universe/Portais';
import { SharedNotebookListClient } from '@/components/shared-notebooks/SharedNotebookListClient';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { buildUniverseHref } from '@/lib/universeNav';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SharedNotebooksPage({ params }: Props) {
  const { slug } = await params;
  const access = await getUniverseAccessBySlug(slug);
  if (!access.universe) notFound();
  if (!access.published && !access.canPreview) notFound();
  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={buildUniverseHref(slug, 'coletivos')} currentLabel='Coletivos' />
      <SharedNotebookListClient slug={slug} title={access.universe.title} />
      <Card className='stack'>
        <Portais slug={slug} currentPath='coletivos' title='Proximas portas' />
      </Card>
    </div>
  );
}
