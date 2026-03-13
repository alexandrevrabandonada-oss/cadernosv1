'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { BrandIcon, type BrandIconName } from '@/components/brand/icons/BrandIcon';
import { buildUniverseHref } from '@/lib/universeNav';

type DockNavProps = {
  slug: string;
};

type DockItem = {
  key: string;
  label: string;
  href: string;
  icon: BrandIconName;
};

function buildDockItems(slug: string, pathname: string): DockItem[] {
  const room = pathname.split('/')[3] || 'hub';

  if (room === 'mapa') {
    return [
      { key: 'hub', label: 'Hub', href: buildUniverseHref(slug, ''), icon: 'showcase' },
      { key: 'provas', label: 'Provas', href: buildUniverseHref(slug, 'provas'), icon: 'provas' },
      { key: 'debate', label: 'Debate', href: buildUniverseHref(slug, 'debate'), icon: 'debate' },
      { key: 'linha', label: 'Linha', href: buildUniverseHref(slug, 'linha'), icon: 'linha' },
    ];
  }

  if (room === 'meu-caderno') {
    return [
      { key: 'hub', label: 'Hub', href: buildUniverseHref(slug, ''), icon: 'showcase' },
      { key: 'recap', label: 'Retomar', href: buildUniverseHref(slug, 'meu-caderno/recap'), icon: 'caderno' },
      { key: 'provas', label: 'Provas', href: buildUniverseHref(slug, 'provas'), icon: 'provas' },
      { key: 'coletivos', label: 'Coletivos', href: buildUniverseHref(slug, 'coletivos'), icon: 'review' },
    ];
  }

  return [
    { key: 'mapa', label: 'Mapa', href: buildUniverseHref(slug, 'mapa'), icon: 'mapa' },
    { key: 'provas', label: 'Provas', href: buildUniverseHref(slug, 'provas'), icon: 'provas' },
    { key: 'debate', label: 'Debate', href: buildUniverseHref(slug, 'debate'), icon: 'debate' },
    { key: 'trilhas', label: 'Trilhas', href: buildUniverseHref(slug, 'trilhas'), icon: 'trilhas' },
  ];
}

export function DockNav({ slug }: DockNavProps) {
  const pathname = usePathname();
  const uiPrefs = useUiPrefsContext();
  const items = buildDockItems(slug, pathname);

  return (
    <nav className='workspace-dock surface-blade' aria-label='Atalhos contextuais mobile' data-testid='dock-nav'>
      <InstallPrompt compact className='workspace-dock-item workspace-dock-install' />
      {items.map((item) => {
        const isActive = pathname === item.href;
        const lastSection = item.key === 'recap' || item.key === 'hub' || item.key === 'coletivos' ? 'provas' : (item.key as 'mapa' | 'provas' | 'linha' | 'debate' | 'glossario' | 'trilhas' | 'tutor');

        return (
          <Link
            key={item.key}
            href={item.href}
            className='workspace-dock-item'
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Abrir ${item.label}`}
            title={item.label}
            onClick={() => uiPrefs?.setLastSection(lastSection)}
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


