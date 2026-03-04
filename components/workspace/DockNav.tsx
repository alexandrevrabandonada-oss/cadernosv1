'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { buildUniverseHref } from '@/lib/universeNav';

type DockNavProps = {
  slug: string;
};

const ITEMS = [
  { key: 'provas', label: 'Provas' },
  { key: 'linha', label: 'Linha' },
  { key: 'glossario', label: 'Glossario' },
  { key: 'trilhas', label: 'Trilhas' },
  { key: 'tutor', label: 'Tutoria' },
  { key: 'debate', label: 'Debate' },
  { key: 'mapa', label: 'Mapa' },
] as const;

export function DockNav({ slug }: DockNavProps) {
  const pathname = usePathname();
  const uiPrefs = useUiPrefsContext();
  return (
    <nav className='workspace-dock' aria-label='Navegacao rapida mobile' data-testid='dock-nav'>
      {ITEMS.map((item) => {
        const href = buildUniverseHref(slug, item.key);
        const isActive = pathname === href;
        return (
          <Link
            key={item.key}
            href={href}
            className='workspace-dock-item'
            aria-current={isActive ? 'page' : undefined}
            onClick={() => uiPrefs?.setLastSection(item.key)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
