'use client';

import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type InstallPromptProps = {
  compact?: boolean;
  className?: string;
};

const DISMISS_KEY = 'cv:pwa-install-dismissed-at';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function readDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

export function InstallPrompt({ compact = false, className = '' }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(standalone || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios/.test(ua);
    setShowIosHelp(isIos && isSafari);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (readDismissedRecently()) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const canShow = useMemo(() => !isInstalled && (Boolean(deferredPrompt) || showIosHelp), [deferredPrompt, isInstalled, showIosHelp]);
  if (!canShow) return null;

  async function onInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'dismissed') {
        markDismissed();
      }
      setDeferredPrompt(null);
      return;
    }
    setIosOpen(true);
  }

  function onDismiss() {
    markDismissed();
    setDeferredPrompt(null);
    setIosOpen(false);
    setShowIosHelp(false);
  }

  return (
    <>
      <button
        type='button'
        className={`ui-button cv-press ${className}`.trim()}
        data-variant={compact ? 'ghost' : 'primary'}
        onClick={onInstall}
        aria-label='Instalar aplicativo'
      >
        Instalar
      </button>
      {iosOpen ? (
        <div className='workspace-sheet-overlay is-open cv-panel-exit' onClick={() => setIosOpen(false)} aria-hidden='true' />
      ) : null}
      {iosOpen ? (
        <aside className='workspace-sheet is-open cv-panel-enter surface-panel' role='dialog' aria-modal='true' aria-label='Como instalar no iOS'>
          <div className='workspace-sheet-handle' aria-hidden='true' />
          <header className='workspace-detail-head'>
            <strong>Instalar no iPhone</strong>
            <button type='button' className='ui-button' data-variant='ghost' onClick={() => setIosOpen(false)}>
              Fechar
            </button>
          </header>
          <div className='workspace-detail-body stack'>
            <p className='muted' style={{ margin: 0 }}>
              No Safari, toque em Compartilhar e escolha Adicionar a Tela de Inicio.
            </p>
            <button type='button' className='ui-button' onClick={onDismiss}>
              Entendi
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
