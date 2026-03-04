import 'server-only';
import { PDFParse } from 'pdf-parse';

export type PdfPageText = {
  page: number;
  text: string;
};

function normalizeText(text: string) {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractPdfPages(buffer: Buffer): Promise<PdfPageText[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText({
      pageJoiner: '\n[[[PAGE:page_number]]]\n',
      lineEnforce: true,
    });

    const pages = result.text
      .split('[[[PAGE:')
      .slice(1)
      .map((part: string) => {
        const endMarker = part.indexOf(']]]');
        const pageNumber = Number(part.slice(0, endMarker));
        const text = normalizeText(part.slice(endMarker + 3));
        return { page: pageNumber, text };
      })
      .filter((page: PdfPageText) => Number.isFinite(page.page));

    if (pages.length > 0) {
      return pages;
    }

    const fallback = normalizeText(result.text);
    return fallback ? [{ page: 1, text: fallback }] : [];
  } finally {
    await parser.destroy();
  }
}
