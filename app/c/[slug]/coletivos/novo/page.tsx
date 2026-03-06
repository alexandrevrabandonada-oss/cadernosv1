import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Card } from '@/components/ui/Card';
import { Portais } from '@/components/universe/Portais';
import { SharedNotebookCreateClient } from '@/components/shared-notebooks/SharedNotebookCreateClient';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { buildUniverseHref } from '@/lib/universeNav';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SharedNotebookCreatePage({ params }: Props) {
  const { slug } = await params;
  const access = await getUniverseAccessBySlug(slug);
  if (!access.universe) notFound();
  if (!access.published && !access.canPreview) notFound();
  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={buildUniverseHref(slug, 'coletivos/novo')} currentLabel='Novo coletivo' />
      <SharedNotebookCreateClient slug={slug} universeTitle={access.universe.title} />
      <Card className='stack'>
        <Portais slug={slug} currentPath='coletivos' title='Proximas portas' />
      </Card>
    </div>
  );
}
