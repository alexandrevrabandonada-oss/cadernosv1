import type { ReactNode } from 'react';

type FilterRailProps = {
  children: ReactNode;
  footer?: ReactNode;
  title?: string;
};

export function FilterRail({ children, footer, title = 'Filtros' }: FilterRailProps) {
  return (
    <div className='workspace-rail stack surface-blade' aria-label='Painel de filtros' data-testid='filter-rail'>
      <header className='workspace-rail-head'>
        <strong className='workspace-rail-title'>{title}</strong>
      </header>
      <div className='workspace-rail-body stack'>{children}</div>
      {footer ? <footer className='workspace-rail-foot'>{footer}</footer> : null}
    </div>
  );
}
