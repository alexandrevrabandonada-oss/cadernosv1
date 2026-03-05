import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { CopyCitationButton } from '@/components/provas/CopyCitationButton';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';
import { SaveToNotebookButton } from '@/components/notes/SaveToNotebookButton';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FocusToggle } from '@/components/ui/FocusToggle';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { canWriteAdminContent } from '@/lib/auth/requireRole';
import { getDocumentViewData, getThreadCitationsForDocument, type DocThreadCitation } from '@/lib/data/debate';
import { buildUniverseHref } from '@/lib/universeNav';

type DocPageProps = {
  params: Promise<{
    slug: string;
    docId: string;
  }>;
  searchParams: Promise<{
    p?: string;
    thread?: string;
    cite?: string;
  }>;
};

function citationPageLabel(citation: Pick<DocThreadCitation, 'pageStart' | 'pageEnd'>) {
  if (!citation.pageStart && !citation.pageEnd) return 's/p';
  if (citation.pageStart && citation.pageEnd && citation.pageStart !== citation.pageEnd) {
    return `p.${citation.pageStart}-${citation.pageEnd}`;
  }
  return `p.${citation.pageStart ?? citation.pageEnd}`;
}

function formatCitationLine(citation: DocThreadCitation) {
  const yearLabel = citation.year ? String(citation.year) : 's.d.';
  return `${citation.docTitle} (${yearLabel}), ${citationPageLabel(citation)}: "${citation.quote}"`;
}

function findFallbackOffsets(text: string, quote: string) {
  const direct = text.indexOf(quote);
  if (direct >= 0) return { start: direct, end: direct + quote.length };

  const lowered = text.toLowerCase().indexOf(quote.toLowerCase());
  if (lowered >= 0) return { start: lowered, end: lowered + quote.length };
  return null;
}

function buildHighlightView(citation: DocThreadCitation) {
  const source = citation.chunkText || '';
  const safeStart = citation.quoteStart;
  const safeEnd = citation.quoteEnd;

  let start = typeof safeStart === 'number' ? safeStart : null;
  let end = typeof safeEnd === 'number' ? safeEnd : null;

  if (start === null || end === null || start < 0 || end <= start || end > source.length) {
    const fallback = findFallbackOffsets(source, citation.quote);
    if (fallback) {
      start = fallback.start;
      end = fallback.end;
    }
  }

  if (start === null || end === null || start < 0 || end <= start || end > source.length) {
    return {
      ok: false,
      before: '',
      mark: '',
      after: '',
    };
  }

  const context = 320;
  const begin = Math.max(0, start - context);
  const finish = Math.min(source.length, end + context);

  return {
    ok: true,
    before: source.slice(begin, start),
    mark: source.slice(start, end),
    after: source.slice(end, finish),
  };
}

export default async function UniverseDocPage({ params, searchParams }: DocPageProps) {
  const { slug, docId } = await params;
  const { p, thread, cite } = await searchParams;
  const currentPath = buildUniverseHref(slug, '');
  const canExportClip = await canWriteAdminContent();
  const doc = await getDocumentViewData(slug, docId);

  if (!doc) {
    notFound();
  }

  const pageHint = p ? `p.${p}` : 'sem pagina definida';
  const threadId = thread?.trim() || '';
  const citations = threadId ? await getThreadCitationsForDocument(slug, docId, threadId) : [];
  const selected = citations.find((item) => item.citationId === cite) ?? citations[0] ?? null;
  const selectedIndex = selected ? citations.findIndex((item) => item.citationId === selected.citationId) : -1;
  const prev = selectedIndex > 0 ? citations[selectedIndex - 1] : null;
  const next = selectedIndex >= 0 && selectedIndex < citations.length - 1 ? citations[selectedIndex + 1] : null;
  const highlight = selected ? buildHighlightView(selected) : null;

  const buildCiteHref = (citationId: string) =>
    `/c/${slug}/doc/${docId}?thread=${encodeURIComponent(threadId)}&cite=${encodeURIComponent(citationId)}`;

  return (
    <div className='stack doc-reader-shell'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Documento' />

      <Card className='stack doc-reader-card'>
        <SectionHeader
          title={doc.title}
          description='Visualizacao simples do documento referenciado nas evidencias.'
          tag='Documento'
        />
        <p className='muted' style={{ margin: 0 }}>
          Status: {doc.status} | Pagina sugerida: {pageHint}
        </p>
        <p className='muted' style={{ margin: 0 }}>
          Autor(es): {doc.authors || 'n/d'} {doc.year ? `| Ano: ${doc.year}` : ''}
        </p>
        <div className='toolbar-row'>
          <FocusToggle compactLabel />
          {doc.signedUrl ? (
            <Link className='ui-button' href={doc.signedUrl} target='_blank' rel='noreferrer'>
              Abrir PDF no Storage
            </Link>
          ) : null}
          {doc.sourceUrl ? (
            <Link className='ui-button' href={doc.sourceUrl} target='_blank' rel='noreferrer'>
              Abrir fonte original
            </Link>
          ) : null}
          <Link className='ui-button' href={buildUniverseHref(slug, 'debate')}>
            Voltar ao debate
          </Link>
        </div>
      </Card>

      {threadId ? (
        <Card className='stack doc-reader-card'>
          <SectionHeader
            title='Citacoes desta resposta'
            description={`Thread ${threadId} | ${citations.length} citacao(oes) para este documento.`}
            tag='Thread'
          />

          <div className='layout-shell doc-reader-grid' style={{ gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)' }}>
            <div className='stack'>
              {citations.map((citation) => (
                <article key={citation.citationId} className='core-node'>
                  <strong>{citationPageLabel(citation)}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {citation.quote.slice(0, 160)}
                    {citation.quote.length > 160 ? '...' : ''}
                  </p>
                  <div className='toolbar-row'>
                    <Link
                      className='ui-button'
                      href={buildCiteHref(citation.citationId)}
                      data-variant={selected?.citationId === citation.citationId ? 'primary' : 'ghost'}
                    >
                      {selected?.citationId === citation.citationId ? 'Selecionada' : 'Abrir'}
                    </Link>
                  </div>
                </article>
              ))}
              {citations.length === 0 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Nenhuma citacao desta thread para este documento.
                </p>
              ) : null}
            </div>

            <div className='stack'>
              <Card className='stack'>
                <SectionHeader
                  title='Trecho destacado'
                  description='Render de contexto ao redor da citacao com offsets quando disponiveis.'
                  tag='Highlight'
                />
                {selected ? (
                  <>
                    <p className='muted' style={{ margin: 0 }}>
                      <Carimbo>{citationPageLabel(selected)}</Carimbo>{' '}
                      {selected.highlightToken ? `token: ${selected.highlightToken}` : 'sem token'}
                    </p>
                    {highlight?.ok ? (
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {highlight.before}
                        <mark style={{ background: '#fff2a8' }}>{highlight.mark}</mark>
                        {highlight.after}
                      </p>
                    ) : (
                      <>
                        <p className='muted' style={{ margin: 0 }}>
                          Nao foi possivel destacar automaticamente este trecho.
                        </p>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selected.quote}</p>
                      </>
                    )}
                    <div className='toolbar-row'>
                      {prev ? (
                        <Link className='ui-button' href={buildCiteHref(prev.citationId)} data-variant='ghost'>
                          Anterior
                        </Link>
                      ) : null}
                      {next ? (
                        <Link className='ui-button' href={buildCiteHref(next.citationId)} data-variant='ghost'>
                          Proxima
                        </Link>
                      ) : null}
                      <CopyCitationButton citation={formatCitationLine(selected)} />
                      <div className='focus-only'>
                        <SaveToNotebookButton
                          universeSlug={slug}
                          kind='highlight'
                          title={`Citacao: ${doc.title}`}
                          text={selected.quote}
                          sourceType='citation'
                          sourceId={selected.citationId}
                          sourceMeta={{
                            docId: doc.id,
                            pageStart: selected.pageStart,
                            pageEnd: selected.pageEnd,
                            threadId: selected.threadId,
                            citationId: selected.citationId,
                          }}
                          tags={[]}
                          label='Salvar citacao'
                          compact
                        />
                      </div>
                      {canExportClip ? (
                        <div className='focus-only'>
                          <GenerateExportButton
                            endpoint='/api/admin/export/clip'
                            label='Exportar trecho'
                            payload={{
                              universeSlug: slug,
                              sourceType: 'doc_cite',
                              sourceId: selected.citationId,
                              title: `Clip: ${doc.title}`,
                              snippet: selected.quote,
                              docId: doc.id,
                              pageStart: selected.pageStart,
                              pageEnd: selected.pageEnd,
                              sourceUrl: doc.sourceUrl,
                              isPublic: false,
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className='muted' style={{ margin: 0 }}>
                    Selecione uma citacao para visualizar o destaque.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
