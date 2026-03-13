'use client';

import type { ReactNode } from 'react';

export function SectionActionBar({ children, ariaLabel = 'Acoes e atalhos da sala' }: { children: ReactNode; ariaLabel?: string }) {
  return (
    <div className='toolbar-row section-action-bar' aria-label={ariaLabel}>
      {children}
    </div>
  );
}
