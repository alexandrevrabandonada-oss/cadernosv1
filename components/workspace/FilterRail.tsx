import type { ReactNode } from 'react';

type FilterRailProps = {
  children: ReactNode;
  footer?: ReactNode;
  title?: string;
};

export function FilterRail({ children, footer, title = 'Filtros' }: FilterRailProps) {
  return (
    <div className='workspace-rail stack' aria-label='Painel de filtros'>
      <header className='workspace-rail-head'>
        <strong>{title}</strong>
      </header>
      <div className='workspace-rail-body stack'>{children}</div>
      {footer ? <footer className='workspace-rail-foot'>{footer}</footer> : null}
    </div>
  );
}
