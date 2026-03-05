'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';

type CopyPackTextButtonProps = {
  text: string;
  label?: string;
};

export function CopyPackTextButton({ text, label = 'Copiar texto do pack' }: CopyPackTextButtonProps) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [, startTransition] = useTransition();
  const toast = useToast();

  return (
    <button
      type='button'
      className='ui-button'
      data-variant='ghost'
      onClick={() => {
        startTransition(async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus('ok');
            toast.success('Copiado');
          } catch {
            setStatus('error');
            toast.error('Falha ao copiar');
          }
          setTimeout(() => setStatus('idle'), 2400);
        });
      }}
    >
      {status === 'ok' ? 'Texto copiado' : status === 'error' ? 'Falha ao copiar' : label}
    </button>
  );
}
