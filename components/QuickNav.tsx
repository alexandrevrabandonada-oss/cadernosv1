import Link from 'next/link';
import { Carimbo } from '@/components/ui/Badge';
import { buildUniverseHref, universeSections } from '@/lib/universeNav';

type QuickNavProps = {
  slug: string;
};

export function QuickNav({ slug }: QuickNavProps) {
  return (
    <aside className='card quicknav-shell' style={{ position: 'sticky', top: 'calc(var(--header-height) + 0.85rem)' }}>
      <div className='stack quicknav-head' style={{ gap: '0.45rem' }}>
        <Carimbo>Workspace</Carimbo>
        <p className='muted' style={{ margin: 0 }}>
          Portas principais do universo em um trilho lateral mais leve.
        </p>
      </div>
      <nav className='stack quicknav-links' aria-label='QuickNav do universo' style={{ marginTop: '0.9rem' }}>
        {universeSections.map((section) => (
          <Link
            key={section.label}
            href={buildUniverseHref(slug, section.path)}
            className='ui-segmented-item quicknav-link'
          >
            <span>{section.label}</span>
            <small>abrir</small>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
