'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buildUniverseHref } from '@/lib/universeNav';

type DockNavProps = {
  slug: string;
};

const ITEMS = [
  { key: 'provas', label: 'Provas' },
  { key: 'linha', label: 'Linha' },
  { key: 'trilhas', label: 'Trilhas' },
  { key: 'tutor', label: 'Tutoria' },
  { key: 'debate', label: 'Debate' },
  { key: 'mapa', label: 'Mapa' },
] as const;

export function DockNav({ slug }: DockNavProps) {
  const pathname = usePathname();
  return (
    <nav className='workspace-dock' aria-label='Navegacao rapida mobile'>
      {ITEMS.map((item) => {
        const href = buildUniverseHref(slug, item.key);
        const isActive = pathname === href;
        return (
          <Link
            key={item.key}
            href={href}
            className='workspace-dock-item'
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
