import 'server-only';
import { randomUUID } from 'crypto';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { getBootstrappedMockUniverseById, listBootstrappedMockUniverses } from '@/lib/universe/bootstrapMock';
import { bootstrapUniverseWorkflow, type CreateUniverseInput } from '@/lib/universe/bootstrap';
import { getUniverseBootstrapTemplate, type UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';
import { getUniverseChecklist, type UniverseChecklist } from '@/lib/ops/universeChecklist';

export type EditorialLane = 'bootstrap' | 'ingest' | 'quality' | 'sprint' | 'review' | 'highlights' | 'publish' | 'done';

export const EDITORIAL_LANES: EditorialLane[] = ['bootstrap', 'ingest', 'quality', 'sprint', 'review', 'highlights', 'publish', 'done'];

export type EditorialProgram = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type EditorialProgramItem = {
  id: string;
  programId: string;
  universeId: string;
  lane: EditorialLane;
  priority: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProgramUniverseSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  published: boolean;
  publishedAt: string | null;
  isFeatured: boolean;
  focusOverride: boolean;
  templateId: UniverseBootstrapTemplateId | null;
};

export type EditorialProgramCard = {
  item: EditorialProgramItem;
  universe: ProgramUniverseSummary;
  checklist: UniverseChecklist | null;
  suggestedLane: EditorialLane;
  templateLabel: string | null;
  suggestedFeaturedAction: boolean;
};

export type EditorialProgramBoard = {
  program: EditorialProgram;
  columns: Array<{
    lane: EditorialLane;
    label: string;
    items: EditorialProgramCard[];
  }>;
  totals: Record<EditorialLane, number>;
};

type MockState = {
  programs: EditorialProgram[];
  items: EditorialProgramItem[];
};

const mockState =
  (globalThis as typeof globalThis & { __cvEditorialProgramState?: MockState }).__cvEditorialProgramState ??
  { programs: [], items: [] };

(globalThis as typeof globalThis & { __cvEditorialProgramState?: MockState }).__cvEditorialProgramState = mockState;

function shouldUseMockPrograms() {
  return process.env.TEST_SEED === '1' || !getSupabaseServiceRoleClient();
}

function laneLabel(lane: EditorialLane) {
  switch (lane) {
    case 'bootstrap':
      return 'Bootstrap';
    case 'ingest':
      return 'Ingest';
    case 'quality':
      return 'Quality';
    case 'sprint':
      return 'Sprint';
    case 'review':
      return 'Review';
    case 'highlights':
      return 'Highlights';
    case 'publish':
      return 'Publish';
    case 'done':
      return 'Done';
  }
}

function cloneProgram(program: EditorialProgram): EditorialProgram {
  return { ...program };
}

function cloneItem(item: EditorialProgramItem): EditorialProgramItem {
  return { ...item };
}

function toProgramUniverseSummary(input: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  published?: boolean | null;
  publishedAt?: string | null;
  isFeatured?: boolean | null;
  focusOverride?: boolean | null;
  templateId?: UniverseBootstrapTemplateId | null;
}): ProgramUniverseSummary {
  return {
    id: input.id,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    published: Boolean(input.published),
    publishedAt: input.publishedAt ?? null,
    isFeatured: Boolean(input.isFeatured),
    focusOverride: Boolean(input.focusOverride),
    templateId: input.templateId ?? null,
  };
}

async function getUniverseSummary(universeId: string): Promise<ProgramUniverseSummary | null> {
  if (shouldUseMockPrograms()) {
    const mock = getBootstrappedMockUniverseById(universeId) ?? listBootstrappedMockUniverses().find((item) => item.id === universeId) ?? null;
    if (!mock) return null;
    return toProgramUniverseSummary({
      id: mock.id,
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      published: mock.published,
      publishedAt: mock.publishedAt,
      isFeatured: mock.isFeatured,
      focusOverride: mock.focusOverride,
      templateId: mock.templateId,
    });
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data } = await db
    .from('universes')
    .select('id, slug, title, summary, published, published_at, is_featured, focus_override')
    .eq('id', universeId)
    .maybeSingle();
  if (!data) return null;
  return toProgramUniverseSummary({
    id: data.id,
    slug: data.slug,
    title: data.title,
    summary: data.summary ?? 'Universo em preparacao.',
    published: data.published,
    publishedAt: data.published_at,
    isFeatured: data.is_featured,
    focusOverride: data.focus_override,
    templateId: getBootstrappedMockUniverseById(universeId)?.templateId ?? null,
  });
}

export async function listEditorialPrograms() {
  if (shouldUseMockPrograms()) {
    return mockState.programs
      .map(cloneProgram)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return [];
  const { data } = await db.from('editorial_programs').select('id, title, slug, summary, created_by, created_at').order('created_at', { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  }));
}

export async function createEditorialProgram(input: { title: string; slug: string; summary?: string | null; userId?: string | null }) {
  if (shouldUseMockPrograms()) {
    const existing = mockState.programs.find((item) => item.slug === input.slug);
    if (existing) return cloneProgram(existing);
    const created: EditorialProgram = {
      id: `mock-program-${randomUUID()}`,
      title: input.title,
      slug: input.slug,
      summary: input.summary?.trim() || null,
      createdBy: input.userId ?? null,
      createdAt: new Date().toISOString(),
    };
    mockState.programs.unshift(created);
    return cloneProgram(created);
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('Admin DB unavailable');
  const { data, error } = await db
    .from('editorial_programs')
    .insert({ title: input.title, slug: input.slug, summary: input.summary?.trim() || null, created_by: input.userId ?? null })
    .select('id, title, slug, summary, created_by, created_at')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Nao foi possivel criar o programa editorial');
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    summary: data.summary ?? null,
    createdBy: data.created_by ?? null,
    createdAt: data.created_at,
  } satisfies EditorialProgram;
}

export async function getEditorialProgram(programIdOrSlug: string) {
  if (shouldUseMockPrograms()) {
    const found = mockState.programs.find((item) => item.id === programIdOrSlug || item.slug === programIdOrSlug);
    return found ? cloneProgram(found) : null;
  }
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const query = db.from('editorial_programs').select('id, title, slug, summary, created_by, created_at');
  const { data } = await (programIdOrSlug.length > 20 ? query.eq('id', programIdOrSlug) : query.eq('slug', programIdOrSlug)).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    summary: data.summary ?? null,
    createdBy: data.created_by ?? null,
    createdAt: data.created_at,
  } satisfies EditorialProgram;
}

export async function addUniverseToProgram(input: {
  programId: string;
  universeId: string;
  lane?: EditorialLane;
  priority?: number;
  note?: string | null;
}) {
  const lane = input.lane ?? 'bootstrap';
  const priority = Number.isFinite(input.priority) ? Number(input.priority) : 0;

  if (shouldUseMockPrograms()) {
    const existing = mockState.items.find((item) => item.programId === input.programId && item.universeId === input.universeId);
    if (existing) {
      existing.lane = lane;
      existing.priority = priority;
      existing.note = input.note?.trim() || null;
      existing.updatedAt = new Date().toISOString();
      return cloneItem(existing);
    }
    const created: EditorialProgramItem = {
      id: `mock-program-item-${randomUUID()}`,
      programId: input.programId,
      universeId: input.universeId,
      lane,
      priority,
      note: input.note?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockState.items.unshift(created);
    return cloneItem(created);
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('Admin DB unavailable');
  const { data, error } = await db
    .from('editorial_program_items')
    .upsert({
      program_id: input.programId,
      universe_id: input.universeId,
      lane,
      priority,
      note: input.note?.trim() || null,
    }, { onConflict: 'program_id,universe_id' })
    .select('id, program_id, universe_id, lane, priority, note, created_at, updated_at')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Nao foi possivel adicionar o universo ao programa');
  return {
    id: data.id,
    programId: data.program_id,
    universeId: data.universe_id,
    lane: data.lane as EditorialLane,
    priority: data.priority,
    note: data.note ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } satisfies EditorialProgramItem;
}

export async function moveProgramItem(input: { itemId: string; lane: EditorialLane; priority?: number; note?: string | null }) {
  if (shouldUseMockPrograms()) {
    const existing = mockState.items.find((item) => item.id === input.itemId);
    if (!existing) throw new Error('Item editorial nao encontrado');
    existing.lane = input.lane;
    if (typeof input.priority === 'number' && Number.isFinite(input.priority)) existing.priority = input.priority;
    if (typeof input.note !== 'undefined') existing.note = input.note?.trim() || null;
    existing.updatedAt = new Date().toISOString();
    return cloneItem(existing);
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('Admin DB unavailable');
  const payload: { lane: EditorialLane; priority?: number; note?: string | null } = { lane: input.lane };
  if (typeof input.priority === 'number' && Number.isFinite(input.priority)) payload.priority = input.priority;
  if (typeof input.note !== 'undefined') payload.note = input.note?.trim() || null;
  const { data, error } = await db
    .from('editorial_program_items')
    .update(payload)
    .eq('id', input.itemId)
    .select('id, program_id, universe_id, lane, priority, note, created_at, updated_at')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Nao foi possivel mover o item editorial');
  return {
    id: data.id,
    programId: data.program_id,
    universeId: data.universe_id,
    lane: data.lane as EditorialLane,
    priority: data.priority,
    note: data.note ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } satisfies EditorialProgramItem;
}

async function listProgramItems(programId: string) {
  if (shouldUseMockPrograms()) {
    return mockState.items
      .filter((item) => item.programId === programId)
      .map(cloneItem)
      .sort((a, b) => b.priority - a.priority || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return [];
  const { data } = await db
    .from('editorial_program_items')
    .select('id, program_id, universe_id, lane, priority, note, created_at, updated_at')
    .eq('program_id', programId)
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    programId: row.program_id,
    universeId: row.universe_id,
    lane: row.lane as EditorialLane,
    priority: row.priority,
    note: row.note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function autoAssessUniverseLane(universeId: string): Promise<EditorialLane> {
  const universe = await getUniverseSummary(universeId);
  const checklist = await getUniverseChecklist(universeId);
  if (!universe) return 'bootstrap';
  if (universe.published) return 'done';
  if (!checklist) return 'bootstrap';

  const docs = checklist.overview.totalDocs;
  const processed = checklist.overview.docsByStatus.processed;
  const uploaded = checklist.overview.docsByStatus.uploaded;
  const quality = checklist.overview.quality.avgTextQualityScore;
  const linked = checklist.overview.links.nodeDocumentsCount + checklist.overview.links.nodeEvidencesCount;
  const publishedEvidences = checklist.overview.publishedEvidencesTotal;
  const draftEvidences = checklist.overview.draftEvidencesTotal + checklist.overview.collectiveReview.review + checklist.overview.collectiveReview.draft;
  const hasHighlights = checklist.overview.collectiveReview.review > 0 || checklist.overview.collectiveReview.draft > 0 || checklist.operational24h.exports24h > 0;

  if (docs === 0) return 'bootstrap';
  if (uploaded > 0 && processed === 0) return 'ingest';
  if (processed > 0 && quality > 0 && quality < 60) return 'quality';
  if (linked === 0) return 'sprint';
  if (draftEvidences > publishedEvidences) return 'review';
  if (publishedEvidences > 0 && !hasHighlights) return 'highlights';
  if (publishedEvidences > 0) return 'publish';
  return 'sprint';
}

export async function getProgramBoard(programIdOrSlug: string): Promise<EditorialProgramBoard | null> {
  const program = await getEditorialProgram(programIdOrSlug);
  if (!program) return null;
  const items = await listProgramItems(program.id);
  const cards = await Promise.all(items.map(async (item) => {
    const [universe, checklist, suggestedLane] = await Promise.all([
      getUniverseSummary(item.universeId),
      getUniverseChecklist(item.universeId),
      autoAssessUniverseLane(item.universeId),
    ]);
    if (!universe) return null;
    return {
      item,
      universe,
      checklist,
      suggestedLane,
      templateLabel: universe.templateId ? getUniverseBootstrapTemplate(universe.templateId)?.label ?? universe.templateId : null,
      suggestedFeaturedAction: suggestedLane === 'done' && universe.published && (!universe.isFeatured || !universe.focusOverride),
    } satisfies EditorialProgramCard;
  }));

  const safeCards = cards.filter((item): item is EditorialProgramCard => Boolean(item));
  const columns = EDITORIAL_LANES.map((lane) => ({
    lane,
    label: laneLabel(lane),
    items: safeCards.filter((item) => item.item.lane === lane),
  }));
  const totals = Object.fromEntries(columns.map((column) => [column.lane, column.items.length])) as Record<EditorialLane, number>;
  return { program, columns, totals };
}

export async function refreshProgramSuggestions(programIdOrSlug: string) {
  const program = await getEditorialProgram(programIdOrSlug);
  if (!program) return null;
  const items = await listProgramItems(program.id);
  const suggestions = await Promise.all(items.map(async (item) => ({
    itemId: item.id,
    currentLane: item.lane,
    suggestedLane: await autoAssessUniverseLane(item.universeId),
  })));
  return { program, suggestions };
}

export async function applySuggestedLanes(programIdOrSlug: string) {
  const program = await getEditorialProgram(programIdOrSlug);
  if (!program) return null;
  const items = await listProgramItems(program.id);
  for (const item of items) {
    const suggested = await autoAssessUniverseLane(item.universeId);
    if (suggested !== item.lane) {
      await moveProgramItem({ itemId: item.id, lane: suggested });
    }
  }
  return getProgramBoard(program.id);
}

export async function createEditorialBatch(input: {
  programId: string;
  userId?: string | null;
  universes: Array<{
    title: string;
    slug: string;
    summary?: string;
    templateId: UniverseBootstrapTemplateId;
    priority?: number;
  }>;
}) {
  const created: Array<{ id: string; slug: string; title: string }> = [];
  for (const universe of input.universes.filter((item) => item.title.trim() && item.slug.trim())) {
    const template = getUniverseBootstrapTemplate(universe.templateId);
    const summary = universe.summary?.trim() || template?.summaryHint || 'Universo em preparacao.';
    const createdUniverse = await bootstrapUniverseWorkflow({
      mode: 'template',
      universe: { title: universe.title.trim(), slug: universe.slug.trim(), summary } satisfies CreateUniverseInput,
      templateId: universe.templateId,
      userId: input.userId ?? null,
    });
    await addUniverseToProgram({
      programId: input.programId,
      universeId: createdUniverse.id,
      lane: 'bootstrap',
      priority: universe.priority ?? 0,
    });
    created.push(createdUniverse);
  }
  return created;
}


