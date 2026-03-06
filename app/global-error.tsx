'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorStateCard } from '@/components/ui/state/ErrorStateCard';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main className='stack' style={{ maxWidth: '48rem', margin: '4rem auto', padding: '0 1rem' }}>
          <ErrorStateCard
            title='Ocorreu uma falha inesperada'
            description='A interface nao conseguiu concluir esta etapa. Voce pode tentar novamente agora ou voltar para um ponto seguro do app.'
            primaryAction={{ label: 'Tentar de novo', onClick: () => reset() }}
            secondaryAction={{ label: 'Ir para Home', href: '/' }}
            details={error.digest ? <span>Referencia tecnica: {error.digest}</span> : undefined}
          />
        </main>
      </body>
    </html>
  );
}
