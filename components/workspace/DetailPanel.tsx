'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonDetail } from '@/components/ui/Skeleton';

type DetailPanelProps = {
  title?: string;
  children?: ReactNode;
  empty?: ReactNode;
  showSkeleton?: boolean;
  headerActions?: ReactNode;
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

export function DetailPanel({
  title = 'Detalhes',
  children,
  empty,
  showSkeleton = false,
  headerActions,
  mobileOpen,
  onCloseMobile,
}: DetailPanelProps) {
  const mobileRef = useRef<HTMLDivElement | null>(null);
  const content =
    showSkeleton ? (
      <SkeletonDetail />
    ) : children ?? empty ?? (
      <EmptyState
        title='Nada selecionado'
        description='Selecione um item no painel central para ver detalhes.'
      />
    );

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
      <aside className='workspace-detail desktop-only surface-panel cv-panel-enter' aria-label='Painel de detalhe' data-testid='detail-panel'>
        <header className='workspace-detail-head'>
          <strong>{title}</strong>
          {headerActions ? <div className='toolbar-row'>{headerActions}</div> : null}
        </header>
        <div className='workspace-detail-body stack'>{content}</div>
      </aside>

      <div className={`workspace-sheet-overlay cv-panel-exit ${mobileOpen ? 'is-open' : ''}`} onClick={onCloseMobile} aria-hidden='true' />
      <aside
        ref={mobileRef}
        className={`workspace-sheet surface-panel cv-panel-enter ${mobileOpen ? 'is-open' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-label={title}
        data-testid='detail-panel'
      >
        <div className='workspace-sheet-handle' aria-hidden='true' />
        <header className='workspace-detail-head'>
          <strong>{title}</strong>
          <div className='toolbar-row'>
            {headerActions}
            <button type='button' className='ui-button' data-variant='ghost' onClick={onCloseMobile} aria-label='Fechar detalhe'>
              Fechar
            </button>
          </div>
        </header>
        <div className='workspace-detail-body stack'>{content}</div>
      </aside>
    </>
  );
}
