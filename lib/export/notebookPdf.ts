import 'server-only';
import { renderConcretoZenPdf } from '@/lib/export/pdf';
import type { RenderNotebookInput } from '@/lib/export/notebook';

export async function renderNotebookPdf(input: RenderNotebookInput) {
  const highlightLines = input.items
    .filter((item) => item.kind === 'highlight')
    .map((item, index) => `${index + 1}. ${(item.title || item.text).slice(0, 120)} | tipo: ${item.source.type}`);
  const noteLines = input.items
    .filter((item) => item.kind === 'note')
    .map((item, index) => `${index + 1}. ${(item.title || item.text).slice(0, 120)} | tipo: ${item.source.type}`);

  return renderConcretoZenPdf({
    title: 'Meu Caderno',
    subtitle: input.universe,
    universeTitle: input.universe,
    generatedAt: input.generatedAt,
    summary: `${input.actorLabel} exportou ${input.stats.includedItems} itens do caderno (${input.stats.highlightCount} highlights e ${input.stats.noteCount} notas).`,
    sections: [
      {
        title: 'Indice por tags',
        body:
          input.includeTagIndex === false
            ? ['Indice por tags desativado para este export.']
            : input.stats.topTags.length > 0
              ? input.stats.topTags.map((item) => `${item.tag} (${item.count})`)
              : ['Sem tags registradas.'],
      },
      {
        title: 'Highlights',
        body: highlightLines.length > 0 ? highlightLines : ['Nenhum highlight incluido.'],
        quoteBoxes: input.items.filter((item) => item.kind === 'highlight').slice(0, 6).map((item) => `${item.text}\n${item.linkToApp}`),
      },
      {
        title: 'Notas',
        body: noteLines.length > 0 ? noteLines : ['Nenhuma nota incluida.'],
        quoteBoxes: input.items.filter((item) => item.kind === 'note').slice(0, 6).map((item) => `${item.text}\n${item.linkToApp}`),
      },
      {
        title: 'Fontes',
        body:
          input.stats.sourceDocs.length > 0
            ? input.stats.sourceDocs.map((item) => `${item.title}${item.year ? ` (${item.year})` : ''}${item.pages.length > 0 ? ` | ${item.pages.join(', ')}` : ''}`)
            : ['Nenhum documento identificado nos metadados exportados.'],
      },
    ],
  });
}
