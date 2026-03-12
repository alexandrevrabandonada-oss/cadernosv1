import { describe, expect, it } from 'vitest';
import {
  analyzePdfBatch,
  clusterBatchByTheme,
  createInboxBatch,
  createUniverseFromInboxBatch,
  suggestCoreNodes,
  suggestGlossary,
  suggestStarterQuestions,
  suggestSummary,
  suggestUniverseFromBatch,
  suggestUniverseTemplate,
  type UniverseInboxItem,
} from '@/lib/universe/inbox';

function makeItem(input: {
  id: string;
  title: string;
  keywords: string[];
  template: 'blank_minimal' | 'issue_investigation' | 'territorial_memory' | 'campaign_watch';
  lowText?: boolean;
}): UniverseInboxItem {
  return {
    id: input.id,
    batchId: 'batch-1',
    fileName: `${input.id}.pdf`,
    fileSize: 1200,
    mimeType: 'application/pdf',
    storagePath: null,
    extractedTitle: input.title,
    previewExcerpt: `${input.title} ${input.keywords.join(' ')}`,
    status: 'analyzed',
    analysis: {
      extractedTitle: input.title,
      previewExcerpt: `${input.title} ${input.keywords.join(' ')}`,
      textLength: input.lowText ? 40 : 1200,
      pageCount: 4,
      topKeywords: input.keywords,
      dominantTemplate: input.template,
      templateScores: {
        blank_minimal: input.template === 'blank_minimal' ? 2 : 0,
        issue_investigation: input.template === 'issue_investigation' ? 9 : 0,
        territorial_memory: input.template === 'territorial_memory' ? 9 : 0,
        campaign_watch: input.template === 'campaign_watch' ? 9 : 0,
      },
      lowText: Boolean(input.lowText),
    },
    createdAt: new Date().toISOString(),
  };
}

describe('universe inbox engine', () => {
  it('sugere template de investigacao quando o lote fala de saude e poluicao', () => {
    const items = [
      makeItem({ id: 'a', title: 'Saude e poluicao', keywords: ['saude', 'poluicao', 'impacto', 'ambiental'], template: 'issue_investigation' }),
      makeItem({ id: 'b', title: 'Risco industrial', keywords: ['risco', 'monitoramento', 'empresa', 'evidencia'], template: 'issue_investigation' }),
    ];

    expect(suggestUniverseTemplate(items)).toBe('issue_investigation');
    const suggestion = suggestUniverseFromBatch(items);
    expect(suggestion.templateId).toBe('issue_investigation');
    expect(suggestion.title).toMatch(/foco|Investigacao/i);
    expect(suggestion.coreNodes.length).toBeGreaterThanOrEqual(5);
    expect(suggestCoreNodes(items).length).toBeGreaterThanOrEqual(5);
    expect(suggestGlossary(items).length).toBeGreaterThanOrEqual(4);
    expect(suggestStarterQuestions(items).length).toBeGreaterThanOrEqual(4);
    expect(suggestSummary(items)).toContain('lote documental');
  });

  it('marca lote misto quando dois grupos tematicos disputam o mesmo batch', () => {
    const items = [
      makeItem({ id: 'a', title: 'Memoria local', keywords: ['memoria', 'bairro', 'historia', 'territorio'], template: 'territorial_memory' }),
      makeItem({ id: 'b', title: 'Clipping semanal', keywords: ['clipping', 'agenda', 'semana', 'sinais'], template: 'campaign_watch' }),
      makeItem({ id: 'c', title: 'Monitoramento', keywords: ['monitoramento', 'boletim', 'alerta', 'debate'], template: 'campaign_watch' }),
    ];

    const cluster = clusterBatchByTheme(items);
    expect(cluster.mixedThemes).toBe(true);
    expect(cluster.clusters).toHaveLength(2);
    const suggestion = suggestUniverseFromBatch(items);
    expect(suggestion.warnings.some((warning) => warning.includes('misturar subtemas'))).toBe(true);
  });

  it('cai para blank_minimal quando o lote tem poucos sinais comuns e texto fraco', () => {
    const items = [
      makeItem({ id: 'a', title: 'Scan 1', keywords: ['scan'], template: 'issue_investigation', lowText: true }),
      makeItem({ id: 'b', title: 'Scan 2', keywords: ['pdf'], template: 'campaign_watch', lowText: true }),
    ];

    const suggestion = suggestUniverseFromBatch(items);
    expect(suggestion.templateId).toBe('blank_minimal');
    expect(suggestion.warnings.some((warning) => warning.includes('poucos sinais tematicos'))).toBe(true);
  });

  it('analisa batch de arquivos e devolve sugestao agregada', async () => {
    const files = [
      new File(['saude poluicao impacto ambiental'], 'saude-poluicao.pdf', { type: 'application/pdf' }),
      new File(['monitoramento industrial empresa evidencia'], 'monitoramento-industrial.pdf', { type: 'application/pdf' }),
    ];

    const analyzed = await analyzePdfBatch(files);
    expect(analyzed.items).toHaveLength(2);
    expect(analyzed.suggestion.templateId).toBe('blank_minimal');
    expect(analyzed.suggestion.slug).toBeTruthy();
  });
});

describe('universe inbox creation', () => {
  it('cria batch mock, cria universo e entra no board em ingest', async () => {
    const batch = await createInboxBatch({
      userId: 'test-user',
      files: [
        new File(['saude poluicao impacto ambiental'], 'saude-poluicao.pdf', { type: 'application/pdf' }),
        new File(['monitoramento industrial empresa evidencia'], 'monitoramento-industrial.pdf', { type: 'application/pdf' }),
      ],
    });

    expect(batch.items).toHaveLength(2);
    expect(batch.analysis.title).toBeTruthy();

    const created = await createUniverseFromInboxBatch({
      batchId: batch.id,
      userId: 'test-user',
      title: 'Inbox Unit Universe',
      slug: 'inbox-unit-universe',
      summary: 'Resumo gerado no teste para validar criacao via inbox.',
      enqueueIngest: false,
    });

    expect(created.universe.slug).toBe('inbox-unit-universe');
    expect(created.docsAttached).toBe(2);
    expect(created.lane).toBe('ingest');
    expect(created.program.slug).toBe('programa-editorial-2026');
  });
});
