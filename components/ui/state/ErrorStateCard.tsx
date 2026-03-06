'use client';

import type { ReactNode } from 'react';

import { StatePanel, type StateAction } from '@/components/ui/state/StatePanel';

type ErrorStateCardProps = {
  title: string;
  description: string;
  eyebrow?: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  details?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function ErrorStateCard(props: ErrorStateCardProps) {
  return <StatePanel tone='error' icon='review' eyebrow={props.eyebrow ?? 'falha de carregamento'} {...props} />;
}
