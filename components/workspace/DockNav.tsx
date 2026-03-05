'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { BrandIcon, type BrandIconName } from '@/components/brand/icons/BrandIcon';
import { buildUniverseHref } from '@/lib/universeNav';

type DockNavProps = {
  slug: string;
};

const ITEMS = [
  { key: 'provas', label: 'Provas', icon: 'provas' as BrandIconName },
  { key: 'linha', label: 'Linha', icon: 'linha' as BrandIconName },
  { key: 'glossario', label: 'Glossario', icon: 'glossario' as BrandIconName },
  { key: 'trilhas', label: 'Trilhas', icon: 'trilhas' as BrandIconName },
  { key: 'tutor', label: 'Tutoria', icon: 'tutor' as BrandIconName },
  { key: 'debate', label: 'Debate', icon: 'debate' as BrandIconName },
  { key: 'mapa', label: 'Mapa', icon: 'mapa' as BrandIconName },
] as const;

export function DockNav({ slug }: DockNavProps) {
  const pathname = usePathname();
  const uiPrefs = useUiPrefsContext();
  return (
    <nav className='workspace-dock surface-blade' aria-label='Navegacao rapida mobile' data-testid='dock-nav'>
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
            <span className='workspace-dock-item-icon' aria-hidden='true'>
              <BrandIcon name={item.icon} size={16} tone={isActive ? 'editorial' : 'default'} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
