'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const DISMISSED_KEY = 'cv:offline-banner:dismissed';

function canRenderBanner(pathname: string) {
  if (!pathname) return true;
  if (pathname.startsWith('/admin')) return false;
  if (pathname.startsWith('/login')) return false;
  return true;
}

export function OfflineBanner() {
  const pathname = usePathname();
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOffline(!navigator.onLine);
    const stored = window.localStorage.getItem(DISMISSED_KEY);
    setDismissed(stored === '1');

    const onOnline = () => {
      setOffline(false);
      window.localStorage.removeItem(DISMISSED_KEY);
      setDismissed(false);
    };
    const onOffline = () => {
      setOffline(true);
      setDismissed(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!canRenderBanner(pathname)) return null;
  if (!offline || dismissed) return null;

  return (
    <div className='offline-banner' role='status' aria-live='polite' data-testid='offline-banner'>
      <div className='offline-banner-copy'>
        <strong>Voce esta offline.</strong>
        <p>O que ja foi salvo continua acessivel. Novas consultas e rotas sem cache podem falhar ate a conexao voltar.</p>
      </div>
      <button
        type='button'
        className='ui-button'
        data-variant='ghost'
        onClick={() => {
          setDismissed(true);
          window.localStorage.setItem(DISMISSED_KEY, '1');
        }}
      >
        Ocultar aviso
      </button>
    </div>
  );
}
