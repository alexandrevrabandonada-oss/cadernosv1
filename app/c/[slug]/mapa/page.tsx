import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { MapExplorer } from '@/components/map/MapExplorer';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getMapData, getNodeRelatedDocuments } from '@/lib/data/universe';
import { buildUniverseHref } from '@/lib/universeNav';

type MapaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function MapaPage({ params }: MapaPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, 'mapa');
  const data = await getMapData(slug);
  const relatedByLabel = await getNodeRelatedDocuments(
    slug,
    data.nodes.map((node) => node.label),
  );
  const nodesWithDocs = data.nodes.map((node) => ({
    ...node,
    relatedDocuments: relatedByLabel[node.label] ?? [],
  }));

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Mapa' />

      <Card className='stack'>
        <SectionHeader
          title={`Mapa do Universo: ${data.title}`}
          description='Grid de nos com conexoes suaves em SVG, filtros e painel lateral de contexto.'
          tag='Mapa'
        />
        <MapExplorer slug={slug} source={data.source} nodes={nodesWithDocs} edges={data.edges} />
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='mapa' title='Proximas portas' />
      </Card>
    </div>
  );
}
