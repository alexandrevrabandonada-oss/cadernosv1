import { Card } from '@/components/ui/Card';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getUniverseMock } from '@/lib/mock/universe';
import { buildUniverseHref } from '@/lib/universeNav';

type SectionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function makeSectionPage(title: string, description: string, path: string) {
  return async function SectionPage({ params }: SectionPageProps) {
    const { slug } = await params;
    const currentPath = buildUniverseHref(slug, path);
    const universe = getUniverseMock(slug);

    return (
      <div className='stack'>
        <OrientationBar slug={slug} currentPath={currentPath} currentLabel={title} />
        <Card className='stack'>
          <SectionHeader title={title} description={description} tag='Secao' />
          <p className='muted' style={{ margin: 0 }}>
            Universo: <strong>{universe.title}</strong> ({slug})
          </p>
        </Card>
        <Card className='stack'>
          <Portais slug={slug} currentPath={path} title='Proximas portas' />
        </Card>
      </div>
    );
  };
}
