import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Card } from '@/components/ui/Card';
import { Portais } from '@/components/universe/Portais';
import { SharedNotebookDetailClient } from '@/components/shared-notebooks/SharedNotebookDetailClient';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { buildUniverseHref } from '@/lib/universeNav';

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function SharedNotebookPage({ params }: Props) {
  const { slug, id } = await params;
  const access = await getUniverseAccessBySlug(slug);
  if (!access.universe) notFound();
  if (!access.published && !access.canPreview) notFound();
  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={buildUniverseHref(slug, `coletivos/${id}`)} currentLabel='Coletivo' />
      <SharedNotebookDetailClient slug={slug} notebookIdOrSlug={id} />
      <Card className='stack'>
        <Portais slug={slug} currentPath='coletivos' title='Proximas portas' />
      </Card>
    </div>
  );
}
