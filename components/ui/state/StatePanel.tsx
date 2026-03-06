'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { BrandIcon, type BrandIconName } from '@/components/brand/icons/BrandIcon';

type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type StateTone = 'empty' | 'error' | 'restricted' | 'success' | 'partial';

type StatePanelProps = {
  tone: StateTone;
  title: string;
  description: string;
  eyebrow?: string;
  icon?: BrandIconName;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  details?: ReactNode;
  children?: ReactNode;
  className?: string;
};

function renderAction(action: StateAction | undefined, variant: 'primary' | 'ghost') {
  if (!action) {
    return null;
  }

  if (action.href) {
    return (
      <Link className='ui-button' data-variant={variant} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <button className='ui-button' data-variant={variant} type='button' onClick={action.onClick}>
      {action.label}
    </button>
  );
}

export function StatePanel({
  tone,
  title,
  description,
  eyebrow,
  icon,
  primaryAction,
  secondaryAction,
  details,
  children,
  className,
}: StatePanelProps) {
  return (
    <section className={['state-panel', className].filter(Boolean).join(' ')} data-tone={tone} aria-live='polite'>
      <div className='state-panel-head'>
        <div className='state-panel-icon' aria-hidden='true'>
          <BrandIcon name={icon ?? 'showcase'} size={20} tone={tone === 'error' ? 'warning' : tone === 'success' ? 'action' : 'editorial'} />
        </div>
        <div className='state-panel-copy'>
          <small>{eyebrow ?? 'estado do sistema'}</small>
          <h2 className='state-panel-title'>{title}</h2>
        </div>
      </div>
      <p className='muted state-panel-description'>{description}</p>
      {details ? <div className='state-panel-details'>{details}</div> : null}
      {children}
      {primaryAction || secondaryAction ? (
        <div className='state-panel-actions'>
          {renderAction(primaryAction, 'primary')}
          {renderAction(secondaryAction, 'ghost')}
        </div>
      ) : null}
    </section>
  );
}

export type { StateAction };
