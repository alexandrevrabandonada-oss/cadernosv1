import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { buildUniverseHref, universeSections } from '@/lib/universeNav';

type OrientationBarProps = {
  slug: string;
  currentPath: string;
  currentLabel: string;
};

export function OrientationBar({ slug, currentPath, currentLabel }: OrientationBarProps) {
  const hubHref = buildUniverseHref(slug, '');
  const items = universeSections.map((section) => ({
    href: buildUniverseHref(slug, section.path),
    label: section.label,
  }));

  return (
    <section className='card stack' aria-label='Barra de orientacao'>
      <Breadcrumb
        items={[
          { href: '/', label: 'Home' },
          { href: hubHref, label: slug },
          { label: currentLabel },
        ]}
        ariaLabel='Trilha de navegacao do universo'
      />
      <div className='toolbar-row'>
        <Button href={hubHref} variant='neutral' ariaLabel='Voltar ao hub do universo'>
          Voltar ao Hub
        </Button>
      </div>
      <Segmented label='Atalhos do universo' items={items} currentPath={currentPath} />
    </section>
  );
}
