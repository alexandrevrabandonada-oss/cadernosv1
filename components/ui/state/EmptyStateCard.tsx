'use client';

import type { ReactNode } from 'react';

import { StatePanel, type StateAction } from '@/components/ui/state/StatePanel';

type EmptyStateCardProps = {
  title: string;
  description: string;
  eyebrow?: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  details?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function EmptyStateCard(props: EmptyStateCardProps) {
  return <StatePanel tone='empty' icon='caderno' eyebrow={props.eyebrow ?? 'ainda sem material'} {...props} />;
}
