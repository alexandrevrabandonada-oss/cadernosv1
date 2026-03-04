import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type NodeDocumentSuggestion = {
  id: string;
  node_id: string;
  document_id: string;
  score: number;
  reasons: string[] | null;
  created_at: string;
};

export type NodeEvidenceSuggestion = {
  id: string;
  node_id: string;
  chunk_id: string;
  document_id: string;
  page_start: number | null;
  page_end: number | null;
  score: number;
  snippet: string;
  created_at: string;
};

export type NodeQuestionSuggestion = {
  id: string;
  node_id: string;
  question: string;
  score: number;
  created_at: string;
};

type GenerateNodeResult = {
  nodeId: string;
  docs: number;
  evidences: number;
  questions: number;
};

const STOPWORDS = new Set([
  'a',
  'o',
  'os',
  'as',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'e',
  'ou',
  'para',
  'por',
  'com',
  'sem',
  'sobre',
  'que',
  'como',
  'um',
  'uma',
  'the',
  'of',
  'in',
  'to',
  'for',
  'on',
  'and',
  'or',
  'is',
  'are',
  'by',
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function overlapCount(a: string[], b: string[]) {
  const bSet = new Set(b);
  return a.reduce((sum, token) => sum + (bSet.has(token) ? 1 : 0), 0);
}

function extractSnippet(text: string, queryTokens: string[]) {
  const normalized = normalizeText(text);
  const token = queryTokens.find((tk) => normalized.includes(tk)) ?? queryTokens[0] ?? '';
  if (!token) return text.slice(0, 420);
  const idx = normalized.indexOf(token);
  if (idx < 0) return text.slice(0, 420);
  const start = Math.max(0, idx - 180);
  const end = Math.min(text.length, idx + 260);
  return text.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, 520);
}

function isCoreNode(kind: string, tags: string[]) {
  if (kind === 'core' || kind === 'concept') return true;
  return tags.some((tag) => tag.toLowerCase() === 'core');
}

export async function listNodeDocumentSuggestions(nodeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as NodeDocumentSuggestion[];
  const { data } = await db
    .from('node_document_suggestions')
    .select('id, node_id, document_id, score, reasons, created_at')
    .eq('node_id', nodeId)
    .order('score', { ascending: false })
    .limit(100);
  return (data ?? []) as NodeDocumentSuggestion[];
}

export async function listNodeEvidenceSuggestions(nodeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as NodeEvidenceSuggestion[];
  const { data } = await db
    .from('node_evidence_suggestions')
    .select('id, node_id, chunk_id, document_id, page_start, page_end, score, snippet, created_at')
    .eq('node_id', nodeId)
    .order('score', { ascending: false })
    .limit(150);
  return (data ?? []) as NodeEvidenceSuggestion[];
}

export async function listNodeQuestionSuggestions(nodeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as NodeQuestionSuggestion[];
  const { data } = await db
    .from('node_question_suggestions')
    .select('id, node_id, question, score, created_at')
    .eq('node_id', nodeId)
    .order('score', { ascending: false })
    .limit(100);
  return (data ?? []) as NodeQuestionSuggestion[];
}

export async function countSuggestionRowsForUniverse(universeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return { docSuggestions: 0, evidenceSuggestions: 0, questionSuggestions: 0 };
  const [docs, evidences, questions] = await Promise.all([
    db.from('node_document_suggestions').select('id', { count: 'exact', head: true }).eq('universe_id', universeId),
    db.from('node_evidence_suggestions').select('id', { count: 'exact', head: true }).eq('universe_id', universeId),
    db.from('node_question_suggestions').select('id', { count: 'exact', head: true }).eq('universe_id', universeId),
  ]);
  return {
    docSuggestions: docs.count ?? 0,
    evidenceSuggestions: evidences.count ?? 0,
    questionSuggestions: questions.count ?? 0,
  };
}

async function suggestDocumentsForNode(universeId: string, nodeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return 0;

  const [{ data: node }, { data: docsRaw }, { data: linked }] = await Promise.all([
    db.from('nodes').select('id, title, tags').eq('id', nodeId).eq('universe_id', universeId).maybeSingle(),
    db
      .from('documents')
      .select('id, title, abstract, authors, journal, status, text_quality_score, is_deleted')
      .eq('universe_id', universeId)
      .eq('is_deleted', false),
    db.from('node_documents').select('document_id').eq('node_id', nodeId),
  ]);
  if (!node) return 0;

  const linkedSet = new Set((linked ?? []).map((row) => row.document_id));
  const nodeTerms = Array.from(
    new Set([...tokenize(node.title), ...(node.tags ?? []).flatMap((tag: string) => tokenize(tag))]),
  ).slice(
    0,
    10,
  );

  const chunkCountByDoc = new Map<string, number>();
  if (nodeTerms.length > 0) {
    const topTerm = nodeTerms.slice(0, 4);
    for (const term of topTerm) {
      const { data: chunkRows } = await db
        .from('chunks')
        .select('document_id')
        .eq('universe_id', universeId)
        .eq('archived', false)
        .ilike('text', `%${term}%`)
        .limit(120);
      for (const row of chunkRows ?? []) {
        chunkCountByDoc.set(row.document_id, (chunkCountByDoc.get(row.document_id) ?? 0) + 1);
      }
    }
  }

  const scored = (docsRaw ?? [])
    .filter((doc) => !linkedSet.has(doc.id))
    .filter((doc) => doc.status !== 'link_only' && doc.status !== 'error')
    .map((doc) => {
      const reasons: string[] = [];
      let score = 0;
      const docText = `${doc.title} ${doc.abstract ?? ''} ${doc.authors ?? ''} ${doc.journal ?? ''}`;
      const docTerms = tokenize(docText);

      if (nodeTerms.some((term) => normalizeText(doc.title).includes(term))) {
        score += 250;
        reasons.push('title_match');
      }

      const overlap = overlapCount(nodeTerms, docTerms);
      if (overlap > 0) {
        score += Math.min(250, overlap * 70);
        reasons.push('keyword_overlap');
      }

      const chunkHits = chunkCountByDoc.get(doc.id) ?? 0;
      if (chunkHits > 0) {
        score += Math.min(350, chunkHits * 50);
        reasons.push('top_chunks');
      }

      const quality = doc.text_quality_score ?? 0;
      score += Math.max(0, Math.floor(quality * 2));
      if (quality < 50) score -= 150;

      if (doc.status === 'processed') score += 100;
      if (doc.status === 'uploaded') score += 20;

      return {
        universe_id: universeId,
        node_id: nodeId,
        document_id: doc.id,
        score: Math.max(0, Math.min(1000, score)),
        reasons: Array.from(new Set(reasons)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (scored.length === 0) return 0;
  await db.from('node_document_suggestions').upsert(scored, { onConflict: 'node_id,document_id' });
  return scored.length;
}

async function suggestEvidenceChunksForNode(universeId: string, nodeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return 0;

  const [{ data: node }, { data: linkedEvidence }, { data: existingQuestions }] = await Promise.all([
    db.from('nodes').select('id, title, tags').eq('id', nodeId).eq('universe_id', universeId).maybeSingle(),
    db.from('node_evidences').select('evidence_id').eq('node_id', nodeId),
    db.from('node_questions').select('question').eq('node_id', nodeId).limit(20),
  ]);
  if (!node) return 0;

  const nodeTokens = Array.from(
    new Set([
      ...tokenize(node.title),
      ...(node.tags ?? []).flatMap((tag: string) => tokenize(tag)),
      ...(existingQuestions ?? []).flatMap((q) => tokenize(q.question)),
    ]),
  ).slice(0, 12);
  if (nodeTokens.length === 0) return 0;

  const linkedEvidenceIds = new Set((linkedEvidence ?? []).map((row) => row.evidence_id));
  const linkedChunkIds = new Set<string>();
  if (linkedEvidenceIds.size > 0) {
    const { data: linkedChunks } = await db
      .from('evidences')
      .select('chunk_id')
      .in('id', Array.from(linkedEvidenceIds))
      .not('chunk_id', 'is', null);
    for (const row of linkedChunks ?? []) {
      if (row.chunk_id) linkedChunkIds.add(row.chunk_id);
    }
  }

  const termRows: Array<{
    id: string;
    document_id: string;
    page_start: number | null;
    page_end: number | null;
    text: string;
  }> = [];
  for (const term of nodeTokens.slice(0, 6)) {
    const { data: rows } = await db
      .from('chunks')
      .select('id, document_id, page_start, page_end, text')
      .eq('universe_id', universeId)
      .eq('archived', false)
      .ilike('text', `%${term}%`)
      .limit(160);
    termRows.push(...(rows ?? []));
  }

  const unique = new Map<string, (typeof termRows)[number]>();
  for (const row of termRows) {
    if (!unique.has(row.id)) unique.set(row.id, row);
  }

  const rows = Array.from(unique.values()).filter((row) => !linkedChunkIds.has(row.id));
  if (rows.length === 0) return 0;

  const docIds = Array.from(new Set(rows.map((row) => row.document_id)));
  const { data: docsRaw } = await db
    .from('documents')
    .select('id, title, status, text_quality_score, is_deleted')
    .in('id', docIds);
  const docById = new Map((docsRaw ?? []).map((doc) => [doc.id, doc]));
  const perDocCount = new Map<string, number>();

  const scored = rows
    .map((row) => {
      const doc = docById.get(row.document_id);
      if (!doc || doc.is_deleted) return null;
      if (doc.status === 'link_only' || doc.status === 'error') return null;
      const perDoc = perDocCount.get(row.document_id) ?? 0;
      if (perDoc >= 3) return null;

      const normalizedText = normalizeText(row.text);
      const hits = nodeTokens.reduce((sum, token) => sum + (normalizedText.includes(token) ? 1 : 0), 0);
      let score = hits * 120 + 180;
      const quality = doc.text_quality_score ?? 0;
      score += Math.floor(Math.max(0, quality) * 1.2);
      if (quality < 50) score -= 120;

      perDocCount.set(row.document_id, perDoc + 1);
      return {
        universe_id: universeId,
        node_id: nodeId,
        chunk_id: row.id,
        document_id: row.document_id,
        page_start: row.page_start,
        page_end: row.page_end,
        score: Math.max(0, Math.min(1000, score)),
        snippet: extractSnippet(row.text, nodeTokens).slice(0, 580),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  if (scored.length === 0) return 0;
  await db.from('node_evidence_suggestions').upsert(scored, { onConflict: 'node_id,chunk_id' });
  return scored.length;
}

async function suggestQuestionsForNode(universeId: string, nodeId: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return 0;

  const [{ data: node }, { data: existingQuestions }, { data: qaRows }] = await Promise.all([
    db.from('nodes').select('id, title').eq('id', nodeId).eq('universe_id', universeId).maybeSingle(),
    db.from('node_questions').select('question').eq('node_id', nodeId).limit(50),
    db
      .from('qa_logs')
      .select('evidence_sufficient, insufficient_reason')
      .eq('universe_id', universeId)
      .eq('kind', 'ask')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(2000),
  ]);
  if (!node) return 0;

  const existing = new Set((existingQuestions ?? []).map((q) => normalizeText(q.question)));
  const askTotal = qaRows?.length ?? 0;
  const askInsufficient = (qaRows ?? []).filter(
    (row) => row.evidence_sufficient === false || row.insufficient_reason !== null,
  ).length;
  const insufficientRate = askTotal > 0 ? (askInsufficient / askTotal) * 100 : 0;
  const lowQuestionBoost = existing.size < 2 ? 140 : existing.size < 4 ? 80 : 20;
  const insufficientBoost = insufficientRate > 60 ? 90 : insufficientRate > 40 ? 50 : 0;

  const templates = [
    `O que os estudos dizem sobre ${node.title} neste universo?`,
    `Quais evidencias apontam riscos a saude relacionados a ${node.title}?`,
    `Quais sao as principais fontes/causas associadas a ${node.title}?`,
    `Quais lacunas e limitacoes aparecem nos estudos sobre ${node.title}?`,
    `Que medidas/politicas sao citadas para reduzir ${node.title} e com quais resultados?`,
    `Quais documentos mais sustentam afirmacoes sobre ${node.title}?`,
    `Como a linha do tempo altera a interpretacao de ${node.title}?`,
    `Que controversias aparecem nas evidencias sobre ${node.title}?`,
    `Quais indicadores ajudam a monitorar ${node.title}?`,
    `Quais perguntas ainda sem resposta permanecem sobre ${node.title}?`,
  ];

  const scored = templates
    .map((question, index) => ({
      universe_id: universeId,
      node_id: nodeId,
      question: question.trim(),
      score: Math.max(0, Math.min(1000, 100 + lowQuestionBoost + insufficientBoost - index * 8)),
    }))
    .filter((item) => !existing.has(normalizeText(item.question)))
    .slice(0, 12);

  if (scored.length === 0) return 0;
  await db.from('node_question_suggestions').upsert(scored, { onConflict: 'node_id,question' });
  return scored.length;
}

export async function generateSuggestionsForNode(universeId: string, nodeId: string): Promise<GenerateNodeResult> {
  const [docs, evidences, questions] = await Promise.all([
    suggestDocumentsForNode(universeId, nodeId),
    suggestEvidenceChunksForNode(universeId, nodeId),
    suggestQuestionsForNode(universeId, nodeId),
  ]);
  return { nodeId, docs, evidences, questions };
}

export async function generateSuggestionsForUniverse(
  universeId: string,
  options: { onlyCore?: boolean; limitNodes?: number } = {},
) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as GenerateNodeResult[];

  const { data: nodesRaw } = await db
    .from('nodes')
    .select('id, kind, tags')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: true });

  let nodes = nodesRaw ?? [];
  if (options.onlyCore) {
    nodes = nodes.filter((node) => isCoreNode(node.kind, node.tags ?? []));
  }
  if (options.limitNodes && options.limitNodes > 0) {
    nodes = nodes.slice(0, options.limitNodes);
  }

  const result: GenerateNodeResult[] = [];
  for (const node of nodes) {
    // Rodada curta por no para manter custo previsivel.
    // eslint-disable-next-line no-await-in-loop
    const generated = await generateSuggestionsForNode(universeId, node.id);
    result.push(generated);
  }
  return result;
}
