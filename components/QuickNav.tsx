import Link from 'next/link';
import { Carimbo } from '@/components/ui/Badge';
import { buildUniverseHref, universeSections } from '@/lib/universeNav';

type QuickNavProps = {
  slug: string;
};

export function QuickNav({ slug }: QuickNavProps) {
  return (
    <aside className='card' style={{ position: 'sticky', top: 'calc(var(--header-height) + 1rem)' }}>
      <div className='stack' style={{ gap: '0.45rem' }}>
        <Carimbo>QuickNav</Carimbo>
        <p className='muted' style={{ margin: 0 }}>
          Navegacao rapida do universo.
        </p>
      </div>
      <nav className='stack' aria-label='QuickNav do universo' style={{ marginTop: '0.75rem' }}>
        {universeSections.map((section) => (
          <Link
            key={section.label}
            href={buildUniverseHref(slug, section.path)}
            className='ui-segmented-item'
          >
            {section.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
