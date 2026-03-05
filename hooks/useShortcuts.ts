'use client';

import { useEffect, useRef } from 'react';
import { buildUniverseHref } from '@/lib/universeNav';

type UseShortcutsInput = {
  universeSlug: string;
  isPaletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  closePanels: () => void;
  toggleFocusMode?: () => void;
  enabled?: boolean;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

function isDesktop() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1024px)').matches;
}

export function useShortcuts({
  universeSlug,
  isPaletteOpen,
  openPalette,
  closePalette,
  closePanels,
  toggleFocusMode,
  enabled = true,
}: UseShortcutsInput) {
  const prefixAtRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isDesktop()) return;
      const key = event.key.toLowerCase();
      const typing = isTypingTarget(event.target);
      const comboOpen = (event.ctrlKey || event.metaKey) && key === 'k';
      if (comboOpen) {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.key === 'Escape') {
        if (isPaletteOpen) {
          event.preventDefault();
          closePalette();
          return;
        }
        closePanels();
        return;
      }

      if (typing) return;

      if (key === 'f' && !isPaletteOpen) {
        event.preventDefault();
        toggleFocusMode?.();
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        openPalette();
        return;
      }

      const now = Date.now();
      if (key === 'g') {
        prefixAtRef.current = now;
        return;
      }

      if (now - prefixAtRef.current > 700) return;

      const sectionByKey: Record<string, string> = {
        m: 'mapa',
        p: 'provas',
        l: 'linha',
        d: 'debate',
        g: 'glossario',
        t: 'trilhas',
        u: 'tutor',
      };
      const section = sectionByKey[key];
      if (!section) return;
      event.preventDefault();
      prefixAtRef.current = 0;
      window.location.href = buildUniverseHref(universeSlug, section);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closePalette, closePanels, enabled, isPaletteOpen, openPalette, toggleFocusMode, universeSlug]);
}
