'use client';

import { useEffect } from 'react';
import { applyHighlights, type AppliedHighlight } from '@/lib/highlights/anchor';

type HighlightLayerProps = {
  container: HTMLElement | null;
  highlights: AppliedHighlight[];
  activeId?: string | null;
  onClickHighlight?: (id: string) => void;
};

export function HighlightLayer({ container, highlights, activeId, onClickHighlight }: HighlightLayerProps) {
  useEffect(() => {
    if (!container) return;
    applyHighlights(container, highlights);
    const marks = Array.from(container.querySelectorAll<HTMLElement>('mark[data-highlight-id]'));
    marks.forEach((mark) => {
      mark.dataset.active = activeId && mark.dataset.highlightId === activeId ? 'true' : 'false';
    });

    if (!onClickHighlight) return;
    const listener = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const mark = target?.closest<HTMLElement>('mark[data-highlight-id]');
      if (!mark?.dataset.highlightId) return;
      onClickHighlight(mark.dataset.highlightId);
    };
    container.addEventListener('click', listener);
    return () => {
      container.removeEventListener('click', listener);
    };
  }, [activeId, container, highlights, onClickHighlight]);

  return null;
}
