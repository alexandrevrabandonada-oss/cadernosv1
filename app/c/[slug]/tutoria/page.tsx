import { TutoriaPanel } from '@/components/tutoria/TutoriaPanel';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getTutoriaData } from '@/lib/data/learning';
import { buildUniverseHref } from '@/lib/universeNav';

type TutoriaPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TutoriaPage({ params }: TutoriaPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, 'tutoria');
  const data = await getTutoriaData(slug);

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Tutoria' />

      <Card className='stack'>
        <SectionHeader
          title={`Tutoria de ${data.universeTitle}`}
          description='Dois modos de acompanhamento: leitura guiada e percurso por portas do universo.'
          tag='Tutoria'
        />
        <div className='toolbar-row'>
          <Carimbo>{data.source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
          <Carimbo>{`licoes:${data.readingLessons.length}`}</Carimbo>
          <Carimbo>{`passos:${data.pathSteps.length}`}</Carimbo>
          <a className='ui-button' href={buildUniverseHref(slug, 'tutor')}>
            Abrir Tutor Mode
          </a>
        </div>
      </Card>

      <Card className='stack'>
        <TutoriaPanel slug={slug} readingLessons={data.readingLessons} pathSteps={data.pathSteps} />
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='tutoria' title='Proximas portas' />
      </Card>
    </div>
  );
}
