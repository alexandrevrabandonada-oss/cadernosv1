'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

type CopyCitationButtonProps = {
  citation: string;
  label?: string;
};

export function CopyCitationButton({ citation, label }: CopyCitationButtonProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      toast.success('Copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      toast.error('Falha ao copiar');
    }
  }

  return (
    <button className='ui-button' type='button' onClick={onCopy} data-variant='ghost'>
      {copied ? 'Copiado' : (label ?? 'Copiar citacao')}
    </button>
  );
}
