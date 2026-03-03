import { ingestConfig } from '@/lib/ingest/config';
import type { PdfPageText } from '@/lib/ingest/pdf';

export type PreparedChunk = {
  page_start: number;
  page_end: number;
  text: string;
};

function splitText(text: string, chunkSize: number, overlap: number) {
  const chunks: string[] = [];
  if (!text) return chunks;

  const safeChunkSize = Math.max(120, chunkSize);
  const safeOverlap = Math.min(Math.max(0, overlap), safeChunkSize - 40);
  let start = 0;

  while (start < text.length) {
    let end = Math.min(text.length, start + safeChunkSize);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start + 80) end = lastSpace;
    }
    const slice = text.slice(start, end).trim();
    if (slice.length >= 30) chunks.push(slice);
    if (end >= text.length) break;
    start = Math.max(0, end - safeOverlap);
  }

  return chunks;
}

export function buildChunksFromPages(pages: PdfPageText[]) {
  const out: PreparedChunk[] = [];
  for (const page of pages) {
    const parts = splitText(page.text, ingestConfig.chunk_size, ingestConfig.overlap);
    for (const text of parts) {
      out.push({
        page_start: page.page,
        page_end: page.page,
        text,
      });
    }
  }
  return out;
}
