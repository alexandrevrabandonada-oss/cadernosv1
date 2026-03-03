import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getUniverseMock } from '@/lib/mock/universe';
import { buildUniverseHref } from '@/lib/universeNav';

type PortaisProps = {
  slug: string;
  currentPath?: string;
  title?: string;
};

export function Portais({ slug, currentPath = '', title = 'Portais' }: PortaisProps) {
  const universe = getUniverseMock(slug);
  const available = universe.portals.filter((portal) => portal.path !== currentPath);

  return (
    <section className='stack' aria-label='Portais do universo'>
      <SectionHeader
        title={title}
        description='Cards de navegacao para atravessar secoes e manter fluidez de exploracao.'
        tag='Navegacao'
      />
      <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {available.map((portal) => (
          <Card key={portal.path} className='stack'>
            <h3 style={{ margin: 0 }}>{portal.title}</h3>
            <p className='muted' style={{ margin: 0 }}>
              {portal.description}
            </p>
            <div className='toolbar-row'>
              <Button href={buildUniverseHref(slug, portal.path)} variant='primary'>
                {portal.cta}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
