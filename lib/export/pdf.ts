import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type PdfSection = {
  title: string;
  body: string[];
  quoteBoxes?: string[];
};

type RenderPdfInput = {
  title: string;
  subtitle: string;
  universeTitle: string;
  generatedAt: string;
  summary: string;
  sections: PdfSection[];
};

type Cursor = {
  pageIndex: number;
  y: number;
};

function wrapText(text: string, maxChars: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export async function renderConcretoZenPdf(input: RenderPdfInput) {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 52;
  const textWidth = pageWidth - margin * 2;

  const pages = [pdf.addPage([pageWidth, pageHeight])];
  const cursor: Cursor = { pageIndex: 0, y: pageHeight - margin };

  function page() {
    return pages[cursor.pageIndex];
  }

  function ensureSpace(minHeight: number) {
    if (cursor.y - minHeight >= margin) return;
    const nextPage = pdf.addPage([pageWidth, pageHeight]);
    pages.push(nextPage);
    cursor.pageIndex += 1;
    cursor.y = pageHeight - margin;
  }

  function drawLine(text: string, size = 11, bold = false, color = rgb(0.12, 0.15, 0.14)) {
    ensureSpace(size + 8);
    page().drawText(text, {
      x: margin,
      y: cursor.y - size,
      size,
      font: bold ? fontBold : fontRegular,
      color,
      maxWidth: textWidth,
    });
    cursor.y -= size + 7;
  }

  function drawParagraph(text: string, size = 11) {
    const lines = wrapText(text, 96);
    for (const line of lines) drawLine(line, size, false);
    cursor.y -= 3;
  }

  function drawQuoteBox(text: string) {
    const lines = wrapText(text, 90);
    const lineHeight = 13;
    const boxHeight = lines.length * lineHeight + 14;
    ensureSpace(boxHeight + 8);
    const yTop = cursor.y;
    page().drawRectangle({
      x: margin,
      y: yTop - boxHeight,
      width: textWidth,
      height: boxHeight,
      color: rgb(0.94, 0.94, 0.92),
      borderColor: rgb(0.36, 0.43, 0.4),
      borderWidth: 1,
    });
    let y = yTop - 18;
    for (const line of lines) {
      page().drawText(line, {
        x: margin + 10,
        y,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.1, 0.12, 0.12),
      });
      y -= lineHeight;
    }
    cursor.y -= boxHeight + 8;
  }

  // Cover
  page().drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(0.96, 0.96, 0.95),
  });
  page().drawRectangle({
    x: margin,
    y: pageHeight - 160,
    width: textWidth,
    height: 4,
    color: rgb(0.26, 0.33, 0.31),
  });
  cursor.y = pageHeight - 110;
  drawLine(input.title, 30, true, rgb(0.15, 0.2, 0.19));
  drawLine(input.subtitle, 16, false, rgb(0.25, 0.3, 0.29));
  drawLine(`Universo: ${input.universeTitle}`, 11, true, rgb(0.2, 0.25, 0.24));
  drawLine(`Gerado em: ${new Date(input.generatedAt).toISOString()}`, 10, false, rgb(0.33, 0.37, 0.36));
  cursor.y -= 12;
  drawParagraph(input.summary, 11.5);
  drawLine('Carimbo: Cadernos Vivos / Concreto Zen', 10, true, rgb(0.2, 0.25, 0.24));

  // New page for content
  const contentPage = pdf.addPage([pageWidth, pageHeight]);
  pages.push(contentPage);
  cursor.pageIndex += 1;
  cursor.y = pageHeight - margin;

  drawLine('Sumario', 18, true, rgb(0.15, 0.2, 0.19));
  input.sections.forEach((section, idx) => drawLine(`${idx + 1}. ${section.title}`, 11, false, rgb(0.22, 0.26, 0.25)));
  cursor.y -= 8;

  for (const [index, section] of input.sections.entries()) {
    ensureSpace(40);
    drawLine(`${index + 1}. ${section.title}`, 16, true, rgb(0.15, 0.2, 0.19));
    for (const paragraph of section.body) {
      drawParagraph(paragraph, 11);
    }
    if (section.quoteBoxes && section.quoteBoxes.length > 0) {
      for (const quote of section.quoteBoxes) {
        drawQuoteBox(quote);
      }
    }
    cursor.y -= 4;
  }

  // Footer on each page
  for (const p of pages) {
    p.drawLine({
      start: { x: margin, y: 32 },
      end: { x: pageWidth - margin, y: 32 },
      thickness: 0.8,
      color: rgb(0.72, 0.74, 0.73),
    });
    p.drawText(`Cadernos Vivos | ${new Date(input.generatedAt).toISOString().slice(0, 10)}`, {
      x: margin,
      y: 18,
      size: 9,
      font: fontRegular,
      color: rgb(0.35, 0.39, 0.38),
    });
  }

  return Buffer.from(await pdf.save());
}
