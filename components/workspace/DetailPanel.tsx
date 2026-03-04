'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type DetailPanelProps = {
  title?: string;
  children?: ReactNode;
  empty?: ReactNode;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function focusables(root: HTMLElement | null) {
  if (!root) return [] as HTMLElement[];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function DetailPanel({ title = 'Detalhes', children, empty, mobileOpen, onCloseMobile }: DetailPanelProps) {
  const mobileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const node = mobileRef.current;
    if (!node) return;
    const items = focusables(node);
    (items[0] ?? node).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseMobile();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = focusables(node);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <aside className='workspace-detail desktop-only' aria-label='Painel de detalhe'>
        <header className='workspace-detail-head'>
          <strong>{title}</strong>
        </header>
        <div className='workspace-detail-body stack'>{children ?? empty}</div>
      </aside>

      <div className={`workspace-sheet-overlay ${mobileOpen ? 'is-open' : ''}`} onClick={onCloseMobile} aria-hidden='true' />
      <aside
        ref={mobileRef}
        className={`workspace-sheet ${mobileOpen ? 'is-open' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-label={title}
      >
        <div className='workspace-sheet-handle' aria-hidden='true' />
        <header className='workspace-detail-head'>
          <strong>{title}</strong>
          <button type='button' className='ui-button' data-variant='ghost' onClick={onCloseMobile} aria-label='Fechar detalhe'>
            Fechar
          </button>
        </header>
        <div className='workspace-detail-body stack'>{children ?? empty}</div>
      </aside>
    </>
  );
}
