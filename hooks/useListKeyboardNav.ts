'use client';

import { useEffect } from 'react';

type UseListKeyboardNavInput = {
  ids: string[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onOpenDetail?: (id: string) => void;
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

export function useListKeyboardNav({
  ids,
  selectedId = '',
  onSelect,
  onOpenDetail,
  enabled = true,
}: UseListKeyboardNavInput) {
  useEffect(() => {
    if (!enabled || ids.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isDesktop()) return;
      if (isTypingTarget(event.target)) return;
      if (document.documentElement.getAttribute('data-palette-open') === '1') return;

      const currentIndex = Math.max(0, ids.indexOf(selectedId));
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = ids[Math.min(ids.length - 1, currentIndex + 1)];
        if (next) onSelect(next);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = ids[Math.max(0, currentIndex - 1)];
        if (prev) onSelect(prev);
      } else if (event.key === 'Home') {
        event.preventDefault();
        onSelect(ids[0]);
      } else if (event.key === 'End') {
        event.preventDefault();
        onSelect(ids[ids.length - 1]);
      } else if (event.key === 'Enter') {
        if (!selectedId) return;
        event.preventDefault();
        if (onOpenDetail) onOpenDetail(selectedId);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, ids, onOpenDetail, onSelect, selectedId]);
}
