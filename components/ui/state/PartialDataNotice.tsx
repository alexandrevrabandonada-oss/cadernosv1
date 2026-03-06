'use client';

import type { ReactNode } from 'react';

import { StatePanel, type StateAction } from '@/components/ui/state/StatePanel';

type PartialDataNoticeProps = {
  title: string;
  description: string;
  eyebrow?: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  details?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PartialDataNotice(props: PartialDataNoticeProps) {
  return (
    <StatePanel
      tone='partial'
      icon='showcase'
      eyebrow={props.eyebrow ?? 'dados parciais'}
      className={['partial-data-notice', props.className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
