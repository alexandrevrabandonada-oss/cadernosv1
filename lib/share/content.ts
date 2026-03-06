import 'server-only';
import { getHubData } from '@/lib/data/universe';
import { getThreadDetail } from '@/lib/data/debate';
import { getTimelineDetail, listTimelineItems } from '@/lib/data/timeline';
import { getNodeDetail } from '@/lib/data/mapa';
import { getGlossaryDetail } from '@/lib/data/glossario';
import { getUniverseBySlug } from '@/lib/data/universes';
import { getExportViewBySlug } from '@/lib/export/service';
import { getUniverseMock } from '@/lib/mock/universe';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type ShareUniverseCard = {
  slug: string;
  title: string;
  summary: string;
  highlights: {
    evidences: Array<{ id: string; title: string; summary: string }>;
    questions: string[];
    events: Array<{ id: string; title: string; kind: string | null; day: string | null }>;
  };
};

export type ShareEvidenceCard = {
  id: string;
  slug: string;
  universeTitle: string;
  title: string;
  snippet: string;
  docTitle: string | null;
  year: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  nodeSlug: string | null;
};

export type ShareThreadCard = {
  id: string;
  slug: string;
  universeTitle: string;
  question: string;
  answer: string;
  mode: 'strict_ok' | 'insufficient';
  dominantDocTitle: string | null;
  dominantDocYear: number | null;
  nodeSlug: string | null;
};

export type ShareEventCard = {
  id: string;
  slug: string;
  universeTitle: string;
  title: string;
  summary: string;
  kind: string;
  day: string | null;
  nodeSlug: string | null;
  documentId: string | null;
};

export type ShareExportCard = {
  id: string;
  slug: string;
  universeTitle: string;
  title: string;
  kind: 'thread' | 'trail' | 'tutor_session' | 'clip' | 'notebook';
  format: 'md' | 'pdf';
  createdAt: string;
  subtitle: string;
  snippet: string;
  downloadUrl: string | null;
  appHref: string | null;
};

export type ShareNodeCard = {
  id: string;
  slug: string;
  universeTitle: string;
  title: string;
  snippet: string;
  tags: string[];
  nodeSlug: string;
  evidences: Array<{ id: string; title: string; summary: string }>;
  questions: string[];
};

export type ShareTermCard = {
  id: string;
  slug: string;
  universeTitle: string;
  term: string;
  snippet: string;
  tags: string[];
  nodeSlug: string | null;
  evidences: Array<{ id: string; title: string; summary: string }>;
  questions: string[];
};

function clip(text: string, max = 220) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function mockEvidence(slug: string, id: string): ShareEvidenceCard | null {
  const mock = getUniverseMock(slug);
  const matches = id.match(/-ev-(\d+)$/);
  const index = matches ? Number(matches[1]) - 1 : 0;
  const node = mock.coreNodes[index] ?? mock.coreNodes[0];
  if (!node) return null;
  return {
    id,
    slug,
    universeTitle: mock.title,
    title: `Evidencia ${index + 1} sobre ${node.label}`,
    snippet: `Trecho curado de exemplo para ${node.label}, usado para validar compartilhamento e preview publico.`,
    docTitle: `Documento Demo ${index + 1}`,
    year: 2020 + (index % 5),
    pageStart: 10 + index,
    pageEnd: 11 + index,
    nodeSlug: node.slug ?? null,
  };
}

function mockEvent(slug: string, id: string): ShareEventCard | null {
  const mock = getUniverseMock(slug);
  const matches = id.match(/-timeline-(\d+)$/);
  const index = matches ? Number(matches[1]) - 1 : 0;
  const node = mock.coreNodes[index] ?? mock.coreNodes[0];
  if (!node) return null;
  return {
    id,
    slug,
    universeTitle: mock.title,
    title: `${node.label}: marco ${index + 1}`,
    summary: clip(node.summary ?? `Marco de linha associado ao no ${node.label}.`),
    kind: index % 2 === 0 ? 'report' : 'event',
    day: new Date(Date.now() - index * 86_400_000 * 30).toISOString().slice(0, 10),
    nodeSlug: node.slug ?? null,
    documentId: null,
  };
}

function mockExport(slug: string, id: string): ShareExportCard {
  const mock = getUniverseMock(slug);
  return {
    id,
    slug,
    universeTitle: mock.title,
    title: `Dossie demo de ${mock.title}`,
    kind: 'thread',
    format: 'pdf',
    createdAt: new Date().toISOString(),
    subtitle: 'Dossie gerado a partir de pergunta (demo)',
    snippet: 'Resumo curto de exemplo para validar compartilhamento de export em ambiente de teste.',
    downloadUrl: `/c/${slug}`,
    appHref: `/c/${slug}/debate?selected=${slug}-thread-1&panel=detail`,
  };
}

function mockNode(slug: string, id: string): ShareNodeCard | null {
  const mock = getUniverseMock(slug);
  const node = mock.coreNodes.find((item) => item.id === id || item.slug === id) ?? mock.coreNodes[0];
  if (!node) return null;
  return {
    id: node.id,
    slug,
    universeTitle: mock.title,
    title: node.label,
    snippet: clip(node.summary ?? `No central do universo ${mock.title}.`, 220),
    tags: (node.tags ?? []).slice(0, 4),
    nodeSlug: node.slug ?? node.id,
    evidences: [
      { id: `${slug}-ev-1`, title: `Evidencia sobre ${node.label}`, summary: 'Trecho curto de apoio para compartilhamento.' },
      { id: `${slug}-ev-2`, title: `Evidencia complementar`, summary: 'Segundo trecho curto para contexto do no.' },
    ],
    questions: [
      `O que as evidencias mostram sobre ${node.label}?`,
      `Quais lacunas ainda existem sobre ${node.label}?`,
    ],
  };
}

function mockTerm(slug: string, id: string): ShareTermCard | null {
  const mock = getUniverseMock(slug);
  const node = mock.coreNodes[0];
  if (!node) return null;
  const termId = `mock-${slug}-${node.id}`;
  if (id !== termId && id !== 'seed-term-1') return null;
  return {
    id: termId,
    slug,
    universeTitle: mock.title,
    term: node.label,
    snippet: clip(node.summary ?? `Termo ligado ao universo ${mock.title}.`, 220),
    tags: (node.tags ?? []).slice(0, 4),
    nodeSlug: node.slug ?? null,
    evidences: [{ id: `${slug}-ev-1`, title: `Evidencia de ${node.label}`, summary: 'Trecho curto de evidencia.' }],
    questions: [`Como ${node.label} aparece nas evidencias do universo?`, `Quais perguntas de pesquisa faltam para ${node.label}?`],
  };
}

async function ensurePublishedUniverse(slug: string) {
  const universe = await getUniverseBySlug(slug);
  if (!universe) return null;
  return universe;
}

export async function getShareUniverse(slug: string): Promise<ShareUniverseCard | null> {
  const universe = await ensurePublishedUniverse(slug);
  if (!universe) return null;
  const hub = await getHubData(slug);
  return {
    slug,
    title: hub.title,
    summary: hub.summary,
    highlights: {
      evidences: hub.highlights.evidences.map((item) => ({ id: item.id, title: item.title, summary: item.summary })),
      questions: hub.highlights.questions.map((item) => item.question),
      events: hub.highlights.events.map((item) => ({ id: item.id, title: item.title, kind: item.kind, day: item.day })),
    },
  };
}

export async function getShareEvidence(slug: string, id: string): Promise<ShareEvidenceCard | null> {
  const universe = await ensurePublishedUniverse(slug);
  if (!universe) return null;

  if (process.env.TEST_SEED === '1') {
    return mockEvidence(slug, id);
  }

  const db = getSupabaseServerClient();
  if (!db) return null;

  const { data: row } = await db
    .from('evidences')
    .select('id, title, summary, document_id, chunk_id, node_id, universe_id')
    .eq('universe_id', universe.id)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (!row) return null;

  const [{ data: doc }, { data: chunk }, { data: node }] = await Promise.all([
    row.document_id
      ? db.from('documents').select('id, title, year').eq('id', row.document_id).maybeSingle()
      : Promise.resolve({ data: null }),
    row.chunk_id
      ? db.from('chunks').select('page_start, page_end, text').eq('id', row.chunk_id).maybeSingle()
      : Promise.resolve({ data: null }),
    row.node_id ? db.from('nodes').select('slug').eq('id', row.node_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    id: row.id,
    slug,
    universeTitle: universe.title,
    title: row.title || 'Evidencia',
    snippet: clip(row.summary || chunk?.text || ''),
    docTitle: doc?.title ?? null,
    year: doc?.year ?? null,
    pageStart: chunk?.page_start ?? null,
    pageEnd: chunk?.page_end ?? null,
    nodeSlug: node?.slug ?? null,
  };
}

export async function getShareThread(slug: string, id: string): Promise<ShareThreadCard | null> {
  const universe = await ensurePublishedUniverse(slug);
  if (!universe) return null;
  const detail = await getThreadDetail(slug, id);
  if (!detail) return null;

  const firstCitation = detail.citations[0] ?? null;
  return {
    id,
    slug,
    universeTitle: universe.title,
    question: detail.thread.question,
    answer: clip(detail.thread.answer, 260),
    mode: detail.thread.mode,
    dominantDocTitle: firstCitation?.docTitle ?? null,
    dominantDocYear: firstCitation?.year ?? null,
    nodeSlug: detail.thread.node?.slug ?? null,
  };
}

export async function getShareEvent(slug: string, id: string): Promise<ShareEventCard | null> {
  const universe = await ensurePublishedUniverse(slug);
  if (!universe) return null;

  let detail = await getTimelineDetail(id);
  if (!detail && process.env.TEST_SEED === '1') {
    return mockEvent(slug, id);
  }
  if (!detail && process.env.TEST_SEED !== '1') {
    const list = await listTimelineItems({
      slug,
      filters: {
        kind: [],
        node: '',
        tags: [],
        q: '',
        yearFrom: null,
        yearTo: null,
        selected: '',
        panel: '',
        cursor: 0,
      },
      limit: 60,
      cursor: 0,
    });
    detail = list.items.find((item) => item.id === id) ?? null;
  }
  if (!detail) return null;

  return {
    id: detail.id,
    slug,
    universeTitle: universe.title,
    title: detail.title,
    summary: clip(detail.summary || detail.body || ''),
    kind: detail.kind,
    day: detail.day ?? null,
    nodeSlug: detail.node?.slug ?? null,
    documentId: detail.document?.id ?? null,
  };
}

export async function getShareExport(slug: string, id: string): Promise<ShareExportCard | null> {
  const universe = await ensurePublishedUniverse(slug);
  if (!universe) return null;

  if (process.env.TEST_SEED === '1') {
    return mockExport(slug, id);
  }

  const view = await getExportViewBySlug(slug, id);
  if (!view || !view.item.is_public) return null;

  const db = getSupabaseServerClient();
  if (!db) return null;

  let subtitle = 'Export do universo';
  let snippet = 'Resumo indisponivel para este export.';
  let appHref: string | null = null;

  if (view.item.kind === 'thread' && view.item.thread_id) {
    const { data: thread } = await db
      .from('qa_threads')
      .select('question, answer')
      .eq('id', view.item.thread_id)
      .maybeSingle();
    subtitle = 'Dossie gerado a partir de pergunta';
    if (thread) {
      snippet = clip(`${thread.question} ${thread.answer}`, 280);
      appHref = `/c/${slug}/debate?selected=${view.item.thread_id}&panel=detail`;
    }
  } else if (view.item.kind === 'trail' && view.item.trail_id) {
    const { data: trail } = await db
      .from('trails')
      .select('title, summary, slug')
      .eq('id', view.item.trail_id)
      .maybeSingle();
    subtitle = 'Caderno de estudo da trilha';
    if (trail) {
      snippet = clip(`${trail.title} ${trail.summary ?? ''}`, 280);
      appHref = `/c/${slug}/trilhas?trail=${encodeURIComponent(trail.slug ?? view.item.trail_id)}`;
    }
  } else if (view.item.kind === 'tutor_session' && view.item.session_id) {
    const { data: summary } = await db
      .from('tutor_session_summaries')
      .select('key_findings, limitations')
      .eq('session_id', view.item.session_id)
      .maybeSingle();
    subtitle = 'Resumo da sessao do tutor';
    const findings = Array.isArray(summary?.key_findings) ? summary?.key_findings : [];
    const firstFinding = findings.find((item) => typeof item?.text === 'string')?.text ?? '';
    snippet = clip(firstFinding || 'Resumo consolidado de sessao de tutor com achados e proximos passos.', 280);
    appHref = `/c/${slug}/tutor/s/${view.item.session_id}/done`;
  } else if (view.item.kind === 'clip') {
    subtitle = 'Clip de leitura';
    snippet = clip(view.item.title, 280);
    if (view.item.source_type === 'thread' && view.item.source_id) {
      appHref = `/c/${slug}/debate?selected=${view.item.source_id}&panel=detail`;
    } else if (view.item.source_type === 'evidence' && view.item.source_id) {
      appHref = `/c/${slug}/provas?selected=${view.item.source_id}&panel=detail`;
    } else if (view.item.source_type === 'doc_cite' && view.item.source_id) {
      appHref = `/c/${slug}/provas?selected=${view.item.source_id}&panel=detail`;
    }
  } else if (view.item.kind === 'notebook') {
    subtitle = 'Pack de estudo do Meu Caderno';
    const itemCount = typeof view.item.meta?.itemCount === 'number' ? view.item.meta.itemCount : null;
    const tags = Array.isArray(view.item.meta?.tags) ? view.item.meta.tags.filter((item) => typeof item === 'string').slice(0, 5) : [];
    snippet = clip(`${itemCount ? `${itemCount} itens.` : ''} ${tags.length > 0 ? `Tags: ${tags.join(', ')}.` : 'Highlights e notas com links para abrir no app.'}`, 280);
    appHref = `/c/${slug}/meu-caderno`;
  }

  let downloadUrl = view.signedUrl;
  if (view.item.format !== 'pdf') {
    let pdfQuery = db
      .from('exports')
      .select('id')
      .eq('universe_id', view.item.universe_id)
      .eq('kind', view.item.kind)
      .eq('format', 'pdf')
      .eq('is_public', true)
      .limit(1);

    if (view.item.thread_id) pdfQuery = pdfQuery.eq('thread_id', view.item.thread_id);
    if (view.item.trail_id) pdfQuery = pdfQuery.eq('trail_id', view.item.trail_id);
    if (view.item.session_id) pdfQuery = pdfQuery.eq('session_id', view.item.session_id);

    const { data: pdfRows } = await pdfQuery;
    const pdfId = (pdfRows ?? [])[0]?.id ?? null;
    if (pdfId) {
      const pdfView = await getExportViewBySlug(slug, pdfId);
      if (pdfView?.item.is_public && pdfView.signedUrl) {
        downloadUrl = pdfView.signedUrl;
      }
    }
  }

  return {
    id: view.item.id,
    slug,
    universeTitle: view.item.universe_title,
    title: view.item.title,
    kind: view.item.kind,
    format: view.item.format,
    createdAt: view.item.created_at,
    subtitle,
    snippet,
    downloadUrl,
    appHref,
  };
}

export async function getShareNode(slug: string, id: string): Promise<ShareNodeCard | null> {
  const universe = await ensurePublishedUniverse(slug);
  if (!universe) return null;

  if (process.env.TEST_SEED === '1') {
    return mockNode(slug, id);
  }

  const detail = await getNodeDetail({ slug, nodeId: id, nodeSlug: id });
  if (!detail || detail.kind !== 'node') return null;

  return {
    id: detail.node.id,
    slug,
    universeTitle: universe.title,
    title: detail.node.title,
    snippet: clip(detail.node.summary || `No do mapa em ${universe.title}.`, 220),
    tags: detail.node.tags.slice(0, 4),
    nodeSlug: detail.node.slug,
    evidences: detail.linkedEvidences.slice(0, 3).map((item) => ({
      id: item.evidence?.id ?? item.id,
      title: item.evidence?.title ?? 'Evidencia',
      summary: clip(item.evidence?.summary ?? 'Sem resumo.', 180),
    })),
    questions: detail.linkedQuestions.slice(0, 2).map((item) => item.question),
  };
}

export async function getShareTerm(slug: string, id: string): Promise<ShareTermCard | null> {
  const universe = await ensurePublishedUniverse(slug);
  if (!universe) return null;

  if (process.env.TEST_SEED === '1') {
    return mockTerm(slug, id);
  }

  const detail = await getGlossaryDetail({ slug, termId: id, termSlug: id });
  if (!detail) return null;

  return {
    id: detail.id,
    slug,
    universeTitle: universe.title,
    term: detail.term,
    snippet: clip(detail.shortDef || detail.body || `Termo do glossario em ${universe.title}.`, 220),
    tags: detail.tags.slice(0, 4),
    nodeSlug: detail.node?.slug ?? null,
    evidences: detail.evidences.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      summary: clip(item.summary, 180),
    })),
    questions: detail.questionPrompts.slice(0, 2),
  };
}


