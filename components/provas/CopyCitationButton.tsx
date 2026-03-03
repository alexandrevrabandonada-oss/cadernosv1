'use client';

import { useState } from 'react';

type CopyCitationButtonProps = {
  citation: string;
};

export function CopyCitationButton({ citation }: CopyCitationButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className='ui-button' type='button' onClick={onCopy} data-variant='ghost'>
      {copied ? 'Copiado' : 'Copiar citacao'}
    </button>
  );
}
