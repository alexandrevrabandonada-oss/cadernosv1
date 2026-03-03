import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { CopyCitationButton } from '@/components/provas/CopyCitationButton';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { buildUniverseHref } from '@/lib/universeNav';

type ProvasPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    doc?: string;
    node?: string;
    year?: string;
  }>;
};

type ChunkRow = {
  id: string;
  document_id: string;
  page_start: number | null;
  page_end: number | null;
  text: string;
  created_at: string;
};

function clip(text: string, max = 260) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function citationFormat(
  docTitle: string,
  year: number | null,
  pageStart: number | null,
  pageEnd: number | null,
  text: string,
) {
  const yearLabel = year ? String(year) : 's.d.';
  const pageLabel =
    pageStart && pageEnd && pageStart !== pageEnd
      ? `p.${pageStart}-${pageEnd}`
      : `p.${pageStart ?? pageEnd ?? 's/p'}`;
  return `${docTitle} (${yearLabel}), ${pageLabel}: "${clip(text, 320)}"`;
}

async function saveEvidenceAction(formData: FormData) {
  'use server';

  const service = getSupabaseServiceRoleClient();
  if (!service) return;

  const slug = String(formData.get('slug') ?? '').trim();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const chunkId = String(formData.get('chunk_id') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const documentId = String(formData.get('document_id') ?? '').trim();
  const docTitle = String(formData.get('doc_title') ?? '').trim();
  const sourceUrl = String(formData.get('source_url') ?? '').trim();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const pageStart = Number(formData.get('page_start') ?? 0) || null;

  if (!slug || !universeId || !chunkId || !documentId || !excerpt) return;

  const title = `Evidencia: ${docTitle || 'Documento'} ${pageStart ? `(p.${pageStart})` : ''}`.trim();
  const summary = clip(excerpt, 420);

  const { data: existing } = await service
    .from('evidences')
    .select('id')
    .eq('universe_id', universeId)
    .eq('chunk_id', chunkId)
    .maybeSingle();

  if (existing?.id) {
    await service
      .from('evidences')
      .update({
        node_id: nodeId || null,
        document_id: documentId,
        title,
        summary,
        source_url: sourceUrl || null,
        curated: true,
      })
      .eq('id', existing.id);
  } else {
    await service.from('evidences').insert({
      universe_id: universeId,
      node_id: nodeId || null,
      document_id: documentId,
      chunk_id: chunkId,
      title,
      summary,
      source_url: sourceUrl || null,
      curated: true,
      confidence: 0.6,
    });
  }

  revalidatePath(buildUniverseHref(slug, 'provas'));
}

export default async function ProvasPage({ params, searchParams }: ProvasPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const db = getSupabaseServerClient();
  const currentPath = buildUniverseHref(slug, 'provas');
  const page = Math.max(Number(sp.page ?? 1) || 1, 1);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;
  const selectedDoc = sp.doc ?? '';
  const selectedNode = sp.node ?? '';
  const selectedYear = sp.year ?? '';

  if (!db) {
    return (
      <div className='stack'>
        <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Provas' />
        <Card className='stack'>
          <SectionHeader title='Provas' description='Banco nao configurado para listar chunks/evidencias.' />
        </Card>
      </div>
    );
  }

  const { data: universe } = await db.from('universes').select('id, title').eq('slug', slug).maybeSingle();
  if (!universe) {
    return (
      <div className='stack'>
        <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Provas' />
        <Card className='stack'>
          <SectionHeader title='Provas' description='Universo nao encontrado.' />
        </Card>
      </div>
    );
  }

  const [{ data: docsRaw }, { data: nodesRaw }] = await Promise.all([
    db
      .from('documents')
      .select('id, title, year, source_url, status')
      .eq('universe_id', universe.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
    db
      .from('nodes')
      .select('id, title')
      .eq('universe_id', universe.id)
      .order('title', { ascending: true }),
  ]);

  const documents = docsRaw ?? [];
  const nodes = nodesRaw ?? [];

  const years = Array.from(new Set(documents.map((doc) => doc.year).filter((year) => typeof year === 'number'))).sort(
    (a, b) => b - a,
  );

  const docsFilteredByYear =
    selectedYear && !Number.isNaN(Number(selectedYear))
      ? documents.filter((doc) => doc.year === Number(selectedYear))
      : documents;

  const docsFiltered = selectedDoc
    ? docsFilteredByYear.filter((doc) => doc.id === selectedDoc)
    : docsFilteredByYear;

  const allowedDocIds = docsFiltered.map((doc) => doc.id);
  const hasDocFilterResult = allowedDocIds.length > 0;

  let nodeChunkIds: string[] | null = null;
  if (selectedNode) {
    const { data: linked } = await db
      .from('evidences')
      .select('chunk_id')
      .eq('universe_id', universe.id)
      .eq('node_id', selectedNode)
      .not('chunk_id', 'is', null);
    nodeChunkIds = Array.from(new Set((linked ?? []).map((row) => row.chunk_id).filter(Boolean)));
  }

  let chunks: ChunkRow[] = [];
  let totalCount = 0;

  if (hasDocFilterResult && (selectedNode ? (nodeChunkIds?.length ?? 0) > 0 : true)) {
    let countQuery = db.from('chunks').select('*', { count: 'exact', head: true }).eq('universe_id', universe.id);
    countQuery = countQuery.in('document_id', allowedDocIds);
    if (selectedNode && nodeChunkIds) countQuery = countQuery.in('id', nodeChunkIds);

    const { count } = await countQuery;
    totalCount = count ?? 0;

    let dataQuery = db
      .from('chunks')
      .select('id, document_id, page_start, page_end, text, created_at')
      .eq('universe_id', universe.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    dataQuery = dataQuery.in('document_id', allowedDocIds);
    if (selectedNode && nodeChunkIds) dataQuery = dataQuery.in('id', nodeChunkIds);

    const { data } = await dataQuery;
    chunks = (data ?? []) as ChunkRow[];
  }

  let evidencesQuery = db
    .from('evidences')
    .select('id, title, summary, confidence, source_url, created_at, node_id, document_id')
    .eq('universe_id', universe.id)
    .eq('curated', true)
    .order('created_at', { ascending: false })
    .limit(40);

  if (selectedNode) evidencesQuery = evidencesQuery.eq('node_id', selectedNode);
  if (selectedDoc) evidencesQuery = evidencesQuery.eq('document_id', selectedDoc);
  if (selectedYear && hasDocFilterResult) evidencesQuery = evidencesQuery.in('document_id', allowedDocIds);

  const { data: evidences } = await evidencesQuery;
  const evidenceList = evidences ?? [];

  const docById = new Map(documents.map((doc) => [doc.id, doc]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const adminCanWrite = Boolean(process.env.ADMIN_MODE === '1' && process.env.SUPABASE_SERVICE_ROLE_KEY);

  const makeLink = (nextPage: number) => {
    const q = new URLSearchParams();
    if (selectedDoc) q.set('doc', selectedDoc);
    if (selectedNode) q.set('node', selectedNode);
    if (selectedYear) q.set('year', selectedYear);
    q.set('page', String(nextPage));
    return `${currentPath}?${q.toString()}`;
  };

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Provas' />

      <Card className='stack'>
        <SectionHeader
          title={`Provas de ${universe.title}`}
          description='Chunks paginados e evidencias curadas com filtros por documento, no e ano.'
          tag='Provas'
        />
      </Card>

      <Card className='stack'>
        <SectionHeader title='Filtros' />
        <form method='get' className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label>
            <span>Documento</span>
            <select name='doc' defaultValue={selectedDoc} style={{ width: '100%', minHeight: 42 }}>
              <option value=''>Todos</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>No</span>
            <select name='node' defaultValue={selectedNode} style={{ width: '100%', minHeight: 42 }}>
              <option value=''>Todos</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Ano</span>
            <select name='year' defaultValue={selectedYear} style={{ width: '100%', minHeight: 42 }}>
              <option value=''>Todos</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <input type='hidden' name='page' value='1' />
          <div className='toolbar-row' style={{ alignItems: 'end' }}>
            <button className='ui-button' type='submit'>
              Aplicar filtros
            </button>
            <Link className='ui-button' href={currentPath} data-variant='ghost'>
              Limpar
            </Link>
          </div>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Chunks' description='Trechos processados da base documental (paginado).' />
        <div className='stack'>
          {chunks.map((chunk) => {
            const doc = docById.get(chunk.document_id);
            const citation = citationFormat(
              doc?.title ?? 'Documento',
              doc?.year ?? null,
              chunk.page_start,
              chunk.page_end,
              chunk.text,
            );
            return (
              <article key={chunk.id} className='core-node'>
                <strong>{doc?.title ?? 'Documento nao encontrado'}</strong>
                <p className='muted' style={{ margin: 0 }}>
                  {doc?.year ? `Ano ${doc.year}` : 'Ano n/d'} | {chunk.page_start ? `p.${chunk.page_start}` : 's/p'}
                  {chunk.page_end && chunk.page_end !== chunk.page_start ? `-${chunk.page_end}` : ''}
                </p>
                <p style={{ margin: 0 }}>{clip(chunk.text, 360)}</p>
                <div className='toolbar-row'>
                  <CopyCitationButton citation={citation} />
                  <form action={saveEvidenceAction}>
                    <input type='hidden' name='slug' value={slug} />
                    <input type='hidden' name='universe_id' value={universe.id} />
                    <input type='hidden' name='chunk_id' value={chunk.id} />
                    <input type='hidden' name='document_id' value={chunk.document_id} />
                    <input type='hidden' name='node_id' value={selectedNode} />
                    <input type='hidden' name='doc_title' value={doc?.title ?? ''} />
                    <input type='hidden' name='source_url' value={doc?.source_url ?? ''} />
                    <input type='hidden' name='page_start' value={chunk.page_start ?? ''} />
                    <input type='hidden' name='page_end' value={chunk.page_end ?? ''} />
                    <input type='hidden' name='excerpt' value={chunk.text} />
                    <button className='ui-button' type='submit' disabled={!adminCanWrite}>
                      Salvar como Evidencia
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
          {chunks.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum chunk encontrado para os filtros atuais.
            </p>
          ) : null}
        </div>

        <div className='toolbar-row'>
          <Link className='ui-button' href={makeLink(Math.max(1, page - 1))} data-variant='ghost'>
            Anterior
          </Link>
          <Carimbo>
            Pagina {page} de {totalPages}
          </Carimbo>
          <Link className='ui-button' href={makeLink(Math.min(totalPages, page + 1))} data-variant='ghost'>
            Proxima
          </Link>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Evidencias curadas' description='Itens salvos a partir dos chunks.' />
        <div className='stack'>
          {evidenceList.map((evidence) => {
            const doc = evidence.document_id ? docById.get(evidence.document_id) : null;
            const node = evidence.node_id ? nodeById.get(evidence.node_id) : null;
            return (
              <article key={evidence.id} className='core-node'>
                <strong>{evidence.title}</strong>
                <p className='muted' style={{ margin: 0 }}>
                  {doc?.title ?? 'Sem documento'} {doc?.year ? `(${doc.year})` : ''} | confianca {evidence.confidence}
                </p>
                <p className='muted' style={{ margin: 0 }}>
                  {node ? `No: ${node.title}` : 'Sem ligacao com no'}
                </p>
                <p style={{ margin: 0 }}>{clip(evidence.summary, 360)}</p>
              </article>
            );
          })}
          {evidenceList.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhuma evidencia curada encontrada.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='provas' title='Proximas portas' />
      </Card>
    </div>
  );
}
