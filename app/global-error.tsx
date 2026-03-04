'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main style={{ padding: 24 }}>
          <h2>Erro inesperado</h2>
          <p>Ocorreu um erro nao tratado. Tente novamente.</p>
          <button className='ui-button' type='button' onClick={() => reset()}>
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
