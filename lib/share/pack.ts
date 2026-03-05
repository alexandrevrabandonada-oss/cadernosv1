import 'server-only';
import { getUniverseMock } from '@/lib/mock/universe';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type SharePackItemType = 'evidence' | 'thread' | 'event' | 'term' | 'node' | 'export';

export type SharePackItem = {
  type: SharePackItemType;
  id: string;
  url: string;
  label: string;
  note?: string | null;
};

export type SharePackDraft = {
  universeId: string;
  universeSlug: string;
  universeTitle: string;
  weekKey: string;
  title: string;
  note: string;
  items: SharePackItem[];
};

export type SharePackRow = {
  id: string;
  universe_id: string;
  week_key: string;
  title: string;
  note: string | null;
  items: SharePackItem[] | null;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const mockStore = globalThis as typeof globalThis & {
  __cvMockSharePacks?: Map<string, SharePackRow>;
};

function getMockSharePacksStore() {
  if (!mockStore.__cvMockSharePacks) {
    mockStore.__cvMockSharePacks = new Map<string, SharePackRow>();
  }
  return mockStore.__cvMockSharePacks;
}

function isTestSeed() {
  return process.env.TEST_SEED === '1';
}

function inferSlugFromUniverseId(universeId: string) {
  if (universeId.startsWith('mock-')) return universeId.replace(/^mock-/, '');
  return universeId;
}

function toIsoWeekParts(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}

export function getWeekKey(date = new Date()) {
  const { year, week } = toIsoWeekParts(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function canonicalShareUrl(slug: string, type: SharePackItemType, id: string) {
  return `/c/${slug}/s/${type}/${id}`;
}

function absoluteUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (!base) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

function dedupeItems(items: SharePackItem[]) {
  const out: SharePackItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function pushItem(
  into: SharePackItem[],
  slug: string,
  input: { type: SharePackItemType; id: string; label: string; note?: string | null },
) {
  if (!input.id) return;
  into.push({
    type: input.type,
    id: input.id,
    label: input.label,
    note: input.note ?? null,
    url: canonicalShareUrl(slug, input.type, input.id),
  });
}

function buildPackNote(universeTitle: string) {
  return [
    `Selecao semanal do universo ${universeTitle}.`,
    'Comece pela evidencia 1, depois passe para a thread para contexto.',
    'Feche com o termo/no para aprofundar e abrir portas no app.',
  ].join(' ');
}

function mockPackBySlug(slug: string, weekKey = getWeekKey()): SharePackDraft {
  const mock = getUniverseMock(slug);
  const node = mock.coreNodes[0];
  const items: SharePackItem[] = [];
  pushItem(items, slug, { type: 'evidence', id: `${slug}-ev-1`, label: 'Evidencia 1 da semana' });
  pushItem(items, slug, { type: 'evidence', id: `${slug}-ev-2`, label: 'Evidencia 2 da semana' });
  pushItem(items, slug, { type: 'thread', id: `${slug}-thread-1`, label: 'Thread em destaque' });
  pushItem(items, slug, { type: 'event', id: `${slug}-timeline-1`, label: 'Marco da linha da semana' });
  pushItem(items, slug, { type: 'term', id: `mock-${slug}-${node.id}`, label: `Termo: ${node.label}` });
  pushItem(items, slug, { type: 'node', id: node.id, label: `No: ${node.label}` });
  pushItem(items, slug, { type: 'export', id: `${slug}-export-1`, label: 'Dossie publico recomendado' });
  return {
    universeId: `mock-${slug}`,
    universeSlug: slug,
    universeTitle: mock.title,
    weekKey,
    title: `Pack da semana — ${mock.title}`,
    note: buildPackNote(mock.title),
    items: dedupeItems(items),
  };
}

export async function generateWeeklyPackBySlug(
  slug: string,
  options: { weekKey?: string } = {},
): Promise<SharePackDraft | null> {
  if (!slug) return null;
  if (process.env.TEST_SEED === '1') return mockPackBySlug(slug, options.weekKey);

  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data: universe } = await db
    .from('universes')
    .select('id, slug, title, published_at, published')
    .eq('slug', slug)
    .maybeSingle();
  if (!universe) return null;
  if (!universe.published_at && !universe.published) return null;
  return generateWeeklyPack(universe.id, options);
}

export async function generateWeeklyPack(
  universeId: string,
  options: { weekKey?: string } = {},
): Promise<SharePackDraft | null> {
  if (!universeId) return null;
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return null;
    const slug = inferSlugFromUniverseId(universeId);
    const mock = mockPackBySlug(slug, options.weekKey ?? getWeekKey());
    return {
      ...mock,
      universeId: universeId.startsWith('mock-') ? universeId : `mock-${slug}`,
    };
  }

  const { data: universe } = await db
    .from('universes')
    .select('id, slug, title')
    .eq('id', universeId)
    .maybeSingle();
  if (!universe) return null;

  const weekKey = options.weekKey ?? getWeekKey();
  const [highlightsRaw, nodesRaw, nodeEvidencesRaw, evidencesRaw, eventsRaw, termsRaw, threadRaw, exportsRaw] =
    await Promise.all([
      db
        .from('universe_highlights')
        .select('evidence_ids, event_ids')
        .eq('universe_id', universeId)
        .maybeSingle(),
      db
        .from('nodes')
        .select('id, slug, title, kind, tags')
        .eq('universe_id', universeId)
        .order('created_at', { ascending: true }),
      db
        .from('node_evidences')
        .select('node_id, evidence_id, pin_rank')
        .eq('universe_id', universeId)
        .order('pin_rank', { ascending: true })
        .limit(300),
      db
        .from('evidences')
        .select('id, title, summary, node_id, created_at, curated')
        .eq('universe_id', universeId)
        .order('created_at', { ascending: false })
        .limit(250),
      db
        .from('events')
        .select('id, title, kind, day, node_id, document_id, created_at')
        .eq('universe_id', universeId)
        .order('day', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(200),
      db
        .from('glossary_terms')
        .select('id, term, node_id, tags, created_at')
        .eq('universe_id', universeId)
        .order('updated_at', { ascending: false })
        .limit(180),
      db
        .from('qa_threads')
        .select('id, question, mode, source, docs_used, chunks_used, node_id, created_at')
        .eq('universe_id', universeId)
        .eq('mode', 'strict_ok')
        .in('source', ['default', 'guided'])
        .gte('docs_used', 2)
        .order('docs_used', { ascending: false })
        .order('chunks_used', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(40),
      db
        .from('exports')
        .select('id, title, kind, format, is_public, created_at')
        .eq('universe_id', universeId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(60),
    ]);

  const nodes = nodesRaw.data ?? [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const coreNodeIds = nodes
    .filter((node) => node.kind === 'core' || (node.tags ?? []).some((tag: string) => tag.toLowerCase() === 'core'))
    .map((node) => node.id);
  const highlightEvidenceIds = (highlightsRaw.data?.evidence_ids ?? []) as string[];
  const highlightEventIds = (highlightsRaw.data?.event_ids ?? []) as string[];
  const evidenceById = new Map((evidencesRaw.data ?? []).map((row) => [row.id, row]));

  const evidenceCandidates = (nodeEvidencesRaw.data ?? [])
    .map((row) => ({
      evidenceId: row.evidence_id,
      nodeId: row.node_id,
      score: 2000 - Math.min(1200, Number(row.pin_rank ?? 1000)),
      highlight: highlightEvidenceIds.includes(row.evidence_id),
    }))
    .filter((row) => evidenceById.has(row.evidenceId))
    .sort((a, b) => {
      if (a.highlight !== b.highlight) return a.highlight ? -1 : 1;
      return b.score - a.score;
    });

  const selectedEvidenceIds: string[] = [];
  const selectedNodeIds = new Set<string>();
  for (const candidate of evidenceCandidates) {
    if (selectedEvidenceIds.includes(candidate.evidenceId)) continue;
    if (selectedEvidenceIds.length < 2 && selectedNodeIds.has(candidate.nodeId)) continue;
    selectedEvidenceIds.push(candidate.evidenceId);
    selectedNodeIds.add(candidate.nodeId);
    if (selectedEvidenceIds.length >= 2) break;
  }
  if (selectedEvidenceIds.length < 2) {
    for (const id of highlightEvidenceIds) {
      if (!evidenceById.has(id) || selectedEvidenceIds.includes(id)) continue;
      selectedEvidenceIds.push(id);
      if (selectedEvidenceIds.length >= 2) break;
    }
  }
  if (selectedEvidenceIds.length < 2) {
    for (const evidence of evidencesRaw.data ?? []) {
      if (selectedEvidenceIds.includes(evidence.id)) continue;
      selectedEvidenceIds.push(evidence.id);
      if (selectedEvidenceIds.length >= 2) break;
    }
  }

  const selectedEvent =
    (eventsRaw.data ?? []).find((event) => highlightEventIds.includes(event.id)) ??
    (eventsRaw.data ?? [])[0] ??
    null;

  const threadCandidates = threadRaw.data ?? [];
  let selectedThread = threadCandidates[0] ?? null;
  if (threadCandidates.length > 0) {
    const threadIds = threadCandidates.map((thread) => thread.id);
    const { data: citationsRaw } = await db
      .from('citations')
      .select('qa_thread_id')
      .in('qa_thread_id', threadIds)
      .limit(500);
    const counts = new Map<string, number>();
    for (const row of citationsRaw ?? []) {
      counts.set(row.qa_thread_id, (counts.get(row.qa_thread_id) ?? 0) + 1);
    }
    selectedThread =
      threadCandidates.find((thread) => (counts.get(thread.id) ?? 0) >= 3) ??
      threadCandidates[0] ??
      null;
  }

  const principalNodeId =
    evidenceById.get(selectedEvidenceIds[0] ?? '')?.node_id ??
    selectedThread?.node_id ??
    coreNodeIds[0] ??
    nodes[0]?.id ??
    null;
  const principalNode = principalNodeId ? nodeById.get(principalNodeId) ?? null : null;
  const principalNodeTags = (principalNode?.tags ?? []).map((tag: string) => tag.toLowerCase());

  const terms = termsRaw.data ?? [];
  const selectedTerm =
    terms.find((term) => principalNodeId && term.node_id === principalNodeId) ??
    terms.find((term) =>
      (term.tags ?? []).some((tag: string) => principalNodeTags.includes(String(tag).toLowerCase())),
    ) ??
    terms[0] ??
    null;

  const publicExports = (exportsRaw.data ?? [])
    .filter((item) => item.is_public)
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  const selectedExport =
    publicExports.find((item) => item.format === 'pdf') ??
    publicExports[0] ??
    null;

  const items: SharePackItem[] = [];
  for (const evidenceId of selectedEvidenceIds.slice(0, 2)) {
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) continue;
    const nodeTitle = evidence.node_id ? nodeById.get(evidence.node_id)?.title : null;
    pushItem(items, universe.slug, {
      type: 'evidence',
      id: evidence.id,
      label: evidence.title || `Evidencia ${evidence.id.slice(0, 8)}`,
      note: nodeTitle ? `No ${nodeTitle}` : null,
    });
  }
  if (selectedEvent) {
    pushItem(items, universe.slug, {
      type: 'event',
      id: selectedEvent.id,
      label: selectedEvent.title || 'Evento recomendado',
      note: selectedEvent.kind ?? null,
    });
  }
  if (selectedThread) {
    pushItem(items, universe.slug, {
      type: 'thread',
      id: selectedThread.id,
      label: selectedThread.question,
      note: `docs:${selectedThread.docs_used ?? 0}`,
    });
  }
  if (selectedTerm) {
    pushItem(items, universe.slug, {
      type: 'term',
      id: selectedTerm.id,
      label: selectedTerm.term,
      note: 'Termo ligado ao pacote',
    });
  }
  if (principalNode) {
    pushItem(items, universe.slug, {
      type: 'node',
      id: principalNode.id,
      label: principalNode.title,
      note: 'No de contexto',
    });
  }
  if (selectedExport) {
    pushItem(items, universe.slug, {
      type: 'export',
      id: selectedExport.id,
      label: selectedExport.title || 'Dossie publico',
      note: `${selectedExport.kind}/${selectedExport.format.toUpperCase()}`,
    });
  }

  return {
    universeId: universe.id,
    universeSlug: universe.slug,
    universeTitle: universe.title,
    weekKey,
    title: `Pack da semana — ${universe.title}`,
    note: buildPackNote(universe.title),
    items: dedupeItems(items),
  };
}

export async function getWeeklyPack(universeId: string, weekKey = getWeekKey()): Promise<SharePackRow | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return null;
    const store = getMockSharePacksStore();
    return (
      Array.from(store.values()).find((pack) => pack.universe_id === universeId && pack.week_key === weekKey) ?? null
    );
  }
  const { data } = await db
    .from('share_packs')
    .select('*')
    .eq('universe_id', universeId)
    .eq('week_key', weekKey)
    .maybeSingle();
  return (data as SharePackRow | null) ?? null;
}

export async function listWeeklyPacks(universeId: string, limit = 12): Promise<SharePackRow[]> {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return [];
    const store = getMockSharePacksStore();
    return Array.from(store.values())
      .filter((pack) => pack.universe_id === universeId)
      .sort((a, b) => (a.week_key > b.week_key ? -1 : 1))
      .slice(0, Math.max(1, Math.min(52, limit)));
  }
  const { data } = await db
    .from('share_packs')
    .select('*')
    .eq('universe_id', universeId)
    .order('week_key', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(Math.max(1, Math.min(52, limit)));
  return (data ?? []) as SharePackRow[];
}

export async function getSharePackById(packId: string): Promise<SharePackRow | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return null;
    return getMockSharePacksStore().get(packId) ?? null;
  }
  const { data } = await db.from('share_packs').select('*').eq('id', packId).maybeSingle();
  return (data as SharePackRow | null) ?? null;
}

export async function upsertWeeklyPack(
  input: {
    universeId: string;
    createdBy: string;
    pin?: boolean;
    weekKey?: string;
  },
  options: { force?: boolean } = {},
) {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return { ok: false as const, message: 'Supabase indisponivel.', blocked: false, pack: null };
    const draft = await generateWeeklyPack(input.universeId, { weekKey: input.weekKey });
    if (!draft) return { ok: false as const, message: 'Nao foi possivel gerar o pack.', blocked: false, pack: null };
    const id = `mock-pack-${draft.universeId}-${draft.weekKey}`;
    const store = getMockSharePacksStore();
    const current = store.get(id) ?? null;
    if (current?.is_pinned && !options.force) {
      return {
        ok: false as const,
        message: 'Pack fixado. Desfixe para regenerar.',
        blocked: true,
        pack: current,
      };
    }
    const pack: SharePackRow = {
      id,
      universe_id: draft.universeId,
      week_key: draft.weekKey,
      title: draft.title,
      note: draft.note,
      items: draft.items,
      is_pinned: typeof input.pin === 'boolean' ? input.pin : current?.is_pinned ?? false,
      created_by: input.createdBy ?? null,
      created_at: current?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.set(id, pack);
    return {
      ok: true as const,
      message: current ? 'Pack semanal regenerado.' : 'Pack semanal gerado.',
      blocked: false,
      pack,
    };
  }

  const draft = await generateWeeklyPack(input.universeId, { weekKey: input.weekKey });
  if (!draft) return { ok: false as const, message: 'Nao foi possivel gerar o pack.', blocked: false, pack: null };

  const current = await getWeeklyPack(input.universeId, draft.weekKey);
  if (current?.is_pinned && !options.force) {
    return {
      ok: false as const,
      message: 'Pack fixado. Desfixe para regenerar.',
      blocked: true,
      pack: current,
    };
  }

  const shouldPin = typeof input.pin === 'boolean' ? input.pin : current?.is_pinned ?? false;
  const { data } = await db
    .from('share_packs')
    .upsert(
      {
        universe_id: draft.universeId,
        week_key: draft.weekKey,
        title: draft.title,
        note: draft.note,
        items: draft.items,
        is_pinned: shouldPin,
        created_by: input.createdBy,
      },
      { onConflict: 'universe_id,week_key' },
    )
    .select('*')
    .maybeSingle();
  return {
    ok: true as const,
    message: current ? 'Pack semanal regenerado.' : 'Pack semanal gerado.',
    blocked: false,
    pack: (data as SharePackRow | null) ?? null,
  };
}

export async function setSharePackPinned(packId: string, isPinned: boolean) {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return null;
    const store = getMockSharePacksStore();
    const current = store.get(packId);
    if (!current) return null;
    const updated = { ...current, is_pinned: isPinned, updated_at: new Date().toISOString() };
    store.set(packId, updated);
    return updated;
  }
  const { data } = await db
    .from('share_packs')
    .update({ is_pinned: isPinned })
    .eq('id', packId)
    .select('*')
    .maybeSingle();
  return (data as SharePackRow | null) ?? null;
}

export function buildSharePackCopyText(pack: {
  title: string;
  note?: string | null;
  items: Array<{ label: string; url: string }>;
}) {
  const lines = [pack.title];
  if (pack.note) lines.push(pack.note);
  lines.push('');
  pack.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.label}`);
    lines.push(absoluteUrl(item.url));
  });
  lines.push('');
  lines.push('Publicado com Cadernos Vivos.');
  return lines.join('\n');
}
