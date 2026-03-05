'use client';

import { useState } from 'react';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { useToast } from '@/components/ui/Toast';
import { feedback } from '@/lib/feedback/feedback';

type CopyCitationButtonProps = {
  citation: string;
  label?: string;
};

export function CopyCitationButton({ citation, label }: CopyCitationButtonProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const prefs = useUiPrefsContext();

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      toast.success('Copiado');
      feedback('tap', prefs?.settings);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      toast.error('Falha ao copiar');
      feedback('warning', prefs?.settings);
    }
  }

  return (
    <button className='ui-button' type='button' onClick={onCopy} data-variant='ghost'>
      {copied ? 'Copiado' : (label ?? 'Copiar citacao')}
    </button>
  );
}
