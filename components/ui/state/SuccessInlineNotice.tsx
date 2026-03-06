'use client';

import type { ReactNode } from 'react';

import { StatePanel, type StateAction } from '@/components/ui/state/StatePanel';

type SuccessInlineNoticeProps = {
  title: string;
  description: string;
  eyebrow?: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  details?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function SuccessInlineNotice(props: SuccessInlineNoticeProps) {
  return (
    <StatePanel
      tone='success'
      icon='published'
      eyebrow={props.eyebrow ?? 'acao concluida'}
      className={['success-inline-notice', props.className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
