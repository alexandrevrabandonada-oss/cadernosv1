'use client';

import type { ReactNode } from 'react';

import { StatePanel, type StateAction } from '@/components/ui/state/StatePanel';

type RestrictedStateCardProps = {
  title: string;
  description: string;
  eyebrow?: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  details?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function RestrictedStateCard(props: RestrictedStateCardProps) {
  return <StatePanel tone='restricted' icon='review' eyebrow={props.eyebrow ?? 'acesso restrito'} {...props} />;
}
