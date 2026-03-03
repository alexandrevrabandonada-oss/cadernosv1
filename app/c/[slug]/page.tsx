import { Card } from '@/components/ui/Card';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getHubData } from '@/lib/data/universe';
import { buildUniverseHref } from '@/lib/universeNav';

type UniversoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function UniversoHubPage({ params }: UniversoPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, '');
  const universe = await getHubData(slug);

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Hub' />

      <Card className='stack'>
        <SectionHeader title={universe.title} description={universe.summary} tag='Hub do Universo' />
        <div className='toolbar-row'>
          <p className='muted' style={{ margin: 0 }}>
            Slug tecnico: <strong>{slug}</strong>
          </p>
          <Carimbo>{universe.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader
          title='Nucleo'
          description='Nucleo com nos para orientar exploracao, investigacao e conexoes.'
          tag='5-9 nos'
        />
        <div className='core-grid'>
          {universe.coreNodes.map((node) => (
            <article className='core-node' key={node.id}>
              <strong>{node.label}</strong>
              <Carimbo>{node.type}</Carimbo>
            </article>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <Portais slug={slug} title='Portais do universo' />
      </Card>
    </div>
  );
}
