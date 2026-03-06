export type HighlightAnchor = {
  prefix: string;
  exact: string;
  suffix: string;
};

export type HighlightSelectionMeta = {
  startOffset: number;
  endOffset: number;
  quote: string;
  anchor: HighlightAnchor;
};

export type AppliedHighlight = {
  id: string;
  startOffset: number;
  endOffset: number;
  quote: string;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function collectTextNodes(container: HTMLElement) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('mark[data-highlight-id]')) return NodeFilter.FILTER_REJECT;
      if (!node.textContent) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Array<{ node: Text; start: number; end: number }> = [];
  let current = walker.nextNode();
  let offset = 0;
  while (current) {
    const textNode = current as Text;
    const value = textNode.textContent ?? '';
    nodes.push({ node: textNode, start: offset, end: offset + value.length });
    offset += value.length;
    current = walker.nextNode();
  }
  return nodes;
}

function textOffsetFromPoint(container: HTMLElement, node: Node, localOffset: number) {
  const nodes = collectTextNodes(container);
  for (const item of nodes) {
    if (item.node === node) return item.start + localOffset;
  }

  const parentText = node.nodeType === Node.TEXT_NODE ? node : node.firstChild;
  if (parentText && parentText.nodeType === Node.TEXT_NODE) {
    for (const item of nodes) {
      if (item.node === parentText) return item.start + localOffset;
    }
  }
  return -1;
}

function buildAnchor(text: string, startOffset: number, endOffset: number): HighlightAnchor {
  return {
    prefix: text.slice(Math.max(0, startOffset - 20), startOffset),
    exact: text.slice(startOffset, endOffset),
    suffix: text.slice(endOffset, Math.min(text.length, endOffset + 20)),
  };
}

export function normalizeSelection(container: HTMLElement, selection: Selection | null): HighlightSelectionMeta | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const startOffset = textOffsetFromPoint(container, range.startContainer, range.startOffset);
  const endOffset = textOffsetFromPoint(container, range.endContainer, range.endOffset);
  if (startOffset < 0 || endOffset <= startOffset) return null;

  const fullText = container.textContent ?? '';
  const quote = normalizeText(range.toString());
  if (!quote) return null;

  return {
    startOffset,
    endOffset,
    quote,
    anchor: buildAnchor(fullText, startOffset, endOffset),
  };
}

export function reanchorHighlight(container: HTMLElement, meta: HighlightSelectionMeta) {
  const text = container.textContent ?? '';
  const direct = text.slice(meta.startOffset, meta.endOffset);
  if (normalizeText(direct) === normalizeText(meta.quote)) {
    return { startOffset: meta.startOffset, endOffset: meta.endOffset };
  }

  const exactNeedle = meta.anchor.exact || meta.quote;
  if (!exactNeedle) return null;
  const index = text.indexOf(exactNeedle);
  if (index >= 0) {
    const startOffset = index;
    const endOffset = index + exactNeedle.length;
    const prefixOk = !meta.anchor.prefix || text.slice(Math.max(0, startOffset - meta.anchor.prefix.length), startOffset) === meta.anchor.prefix;
    const suffixOk = !meta.anchor.suffix || text.slice(endOffset, endOffset + meta.anchor.suffix.length) === meta.anchor.suffix;
    if (prefixOk || suffixOk) return { startOffset, endOffset };
  }

  const normalizedIndex = text.toLowerCase().indexOf(exactNeedle.toLowerCase());
  if (normalizedIndex >= 0) {
    return { startOffset: normalizedIndex, endOffset: normalizedIndex + exactNeedle.length };
  }
  return null;
}

function unwrapMarks(container: HTMLElement) {
  const marks = container.querySelectorAll('mark[data-highlight-id]');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

function splitBoundaries(node: Text, startInNode: number, endInNode: number) {
  let target = node;
  if (startInNode > 0) {
    target = target.splitText(startInNode);
  }
  if (endInNode - startInNode < target.textContent!.length) {
    target.splitText(endInNode - startInNode);
  }
  return target;
}

export function applyHighlights(container: HTMLElement, highlights: AppliedHighlight[]) {
  unwrapMarks(container);
  const nodes = collectTextNodes(container);
  const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

  for (const highlight of sorted) {
    for (const item of nodes) {
      if (highlight.endOffset <= item.start || highlight.startOffset >= item.end) continue;
      const startInNode = Math.max(0, highlight.startOffset - item.start);
      const endInNode = Math.min(item.end, highlight.endOffset) - item.start;
      if (endInNode <= startInNode) continue;
      const target = splitBoundaries(item.node, startInNode, endInNode);
      const mark = document.createElement('mark');
      mark.dataset.highlightId = highlight.id;
      mark.className = 'doc-inline-highlight';
      target.parentNode?.insertBefore(mark, target);
      mark.appendChild(target);
    }
  }
}
