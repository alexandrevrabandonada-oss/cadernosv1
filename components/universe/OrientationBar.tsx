import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { UniverseLocalNav } from '@/components/universe/UniverseLocalNav';
import { buildUniverseHref } from '@/lib/universeNav';

type OrientationBarProps = {
  slug: string;
  currentPath: string;
  currentLabel: string;
};

export function OrientationBar({ slug, currentPath, currentLabel }: OrientationBarProps) {
  const resolvedCurrentLabel = currentLabel === 'Hub' ? 'Hub editorial' : currentLabel === 'Tutoria' ? 'Tutor' : currentLabel;

  return (
    <section className='universe-local-shell stack' aria-label='Barra local do universo'>
      <Breadcrumb
        items={[
          { href: '/', label: 'Home' },
          { href: buildUniverseHref(slug, ''), label: 'Universo' },
          { label: resolvedCurrentLabel },
        ]}
        ariaLabel='Trilha de navegacao do universo'
      />
      <UniverseLocalNav slug={slug} currentPath={currentPath} />
    </section>
  );
}
