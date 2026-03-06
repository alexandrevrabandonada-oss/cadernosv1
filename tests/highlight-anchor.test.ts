import { describe, expect, it, beforeEach } from 'vitest';
import { normalizeSelection, reanchorHighlight } from '@/lib/highlights/anchor';

describe('highlight anchor utils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('serializes selection offsets relative to linear text', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>Alpha beta</p><p>gamma delta</p>';
    document.body.appendChild(container);

    const first = container.querySelectorAll('p')[0]?.firstChild as Text;
    const range = document.createRange();
    range.setStart(first, 6);
    range.setEnd(first, 10);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const normalized = normalizeSelection(container, selection);
    expect(normalized?.quote).toBe('beta');
    expect(normalized?.startOffset).toBe(6);
    expect(normalized?.endOffset).toBe(10);
  });

  it('reanchors by prefix/suffix when offsets drift', () => {
    const container = document.createElement('div');
    container.textContent = 'Zero Alpha beta gamma delta';
    document.body.appendChild(container);

    const result = reanchorHighlight(container, {
      startOffset: 0,
      endOffset: 4,
      quote: 'beta',
      anchor: { prefix: 'Alpha ', exact: 'beta', suffix: ' gamma' },
    });

    expect(result).toEqual({ startOffset: 11, endOffset: 15 });
  });
});
