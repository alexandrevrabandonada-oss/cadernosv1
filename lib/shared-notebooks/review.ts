import 'server-only';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import {
  getMockSharedNotebookReview,
  listMockReviewQueue,
  listMockSharedNotebookAudit,
  promoteMockSharedNotebookItem,
  updateMockSharedNotebookReview,
} from '@/lib/shared-notebooks/mock';
import { canEditSharedNotebook } from '@/lib/shared-notebooks/access';
import type {
  PromoteSharedNotebookItemInput,
  SharedNotebookAuditItem,
  SharedNotebookPromotedType,
  SharedNotebookReviewDetail,
  SharedNotebookReviewQueueItem,
  SharedNotebookReviewStatus,
  SharedNotebookSourceType,
  UpdateSharedNotebookReviewInput,
} from '@/lib/shared-notebooks/types';

function isMockMode() {
  return process.env.TEST_SEED === '1' || !getSupabaseServiceRoleClient();
}

function clamp(value: string, max: number) {
  const clean = String(value ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

function normalizeTemplateMeta(meta: Record<string, unknown> | null | undefined) {
  const source = meta && typeof meta === 'object' ? meta : {};
  return {
    suggestedTags: Array.isArray(source.suggestedTags) ? source.suggestedTags.map((tag) => String(tag)) : [],
    preferredSources: Array.isArray(source.preferredSources) ? source.preferredSources.map((value) => String(value) as SharedNotebookSourceType) : [],
    microcopy: typeof source.microcopy === 'string' ? source.microcopy : '',
  };
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64) || 'item';
}

async function getContext(universeSlug: string) {
  const [session, access] = await Promise.all([getCurrentSession(), getUniverseAccessBySlug(universeSlug)]);
  if (!access.universe) return null;
  if (!access.published && !access.canPreview) return null;
  return { session, access, universe: access.universe };
}

async function getNotebookWithRole(input: { universeSlug: string; notebookIdOrSlug: string }) {
  const ctx = await getContext(input.universeSlug);
  if (!ctx?.session?.userId) return null;
  if (isMockMode() || ctx.session.userId === 'dev-bypass') {
    const notebook = getMockSharedNotebookReview({
      universeSlug: input.universeSlug,
      notebookIdOrSlug: input.notebookIdOrSlug,
      userId: ctx.session.userId,
      isUniversePublished: ctx.access.published,
    });
    return notebook ? { ctx, notebook } : null;
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data: notebook } = await db
    .from('shared_notebooks')
    .select('*')
    .eq('universe_id', ctx.universe.id)
    .or(`id.eq.${input.notebookIdOrSlug},slug.eq.${input.notebookIdOrSlug}`)
    .maybeSingle();
  if (!notebook) return null;

  const [{ data: memberships }, { data: itemRows }, { data: auditRows }] = await Promise.all([
    db.from('shared_notebook_members').select('*').eq('notebook_id', notebook.id),
    db.from('shared_notebook_items').select('*').eq('notebook_id', notebook.id).order('created_at', { ascending: false }),
    db.from('shared_notebook_audit_logs').select('*').eq('notebook_id', notebook.id).order('created_at', { ascending: false }).limit(200),
  ]);

  const role = (memberships ?? []).find((item) => item.user_id === ctx.session?.userId)?.role ?? null;
  if (!canEditSharedNotebook(role)) return null;

  const auditByItem: Record<string, SharedNotebookAuditItem[]> = {};
  for (const row of (auditRows ?? []) as Array<Record<string, unknown>>) {
    const mapped = {
      id: String(row.id),
      notebookId: String(row.notebook_id),
      itemId: String(row.item_id),
      action: String(row.action) as SharedNotebookAuditItem['action'],
      fromStatus: (typeof row.from_status === 'string' ? row.from_status : null) as SharedNotebookReviewStatus | null,
      toStatus: (typeof row.to_status === 'string' ? row.to_status : null) as SharedNotebookReviewStatus | null,
      note: typeof row.note === 'string' ? row.note : null,
      changedBy: typeof row.changed_by === 'string' ? row.changed_by : null,
      createdAt: String(row.created_at),
    } satisfies SharedNotebookAuditItem;
    auditByItem[mapped.itemId] ??= [];
    auditByItem[mapped.itemId].push(mapped);
  }

  return {
    ctx,
    notebook: {
      id: notebook.id,
      universeId: notebook.universe_id,
      universeSlug: input.universeSlug,
      title: notebook.title,
      slug: notebook.slug,
      summary: notebook.summary ?? null,
      visibility: notebook.visibility,
      templateId: typeof notebook.meta?.templateId === 'string' ? notebook.meta.templateId : null,
      templateMeta: normalizeTemplateMeta((notebook.meta ?? null) as Record<string, unknown> | null),
      createdBy: notebook.created_by,
      createdAt: notebook.created_at,
      updatedAt: notebook.updated_at,
      memberRole: role,
      itemCount: (itemRows ?? []).length,
      items: ((itemRows ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        notebookId: String(item.notebook_id),
        universeId: String(item.universe_id),
        sourceType: String(item.source_type) as SharedNotebookReviewDetail['items'][number]['sourceType'],
        sourceId: typeof item.source_id === 'string' ? item.source_id : null,
        sourceMeta: (item.source_meta ?? {}) as Record<string, unknown>,
        title: typeof item.title === 'string' ? item.title : null,
        text: String(item.text),
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
        note: typeof item.note === 'string' ? item.note : null,
        addedBy: String(item.added_by),
        addedByLabel: typeof (item.source_meta as Record<string, unknown> | null)?.addedByLabel === 'string' ? String((item.source_meta as Record<string, unknown>).addedByLabel) : 'Usuario',
        reviewStatus: (typeof item.review_status === 'string' ? item.review_status : 'draft') as SharedNotebookReviewStatus,
        editorialNote: typeof item.editorial_note === 'string' ? item.editorial_note : null,
        reviewedBy: typeof item.reviewed_by === 'string' ? item.reviewed_by : null,
        reviewedAt: typeof item.reviewed_at === 'string' ? item.reviewed_at : null,
        promotedType: typeof item.promoted_type === 'string' ? (item.promoted_type as SharedNotebookPromotedType) : null,
        promotedId: typeof item.promoted_id === 'string' ? item.promoted_id : null,
        createdAt: String(item.created_at),
      })),
      members: ((memberships ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        notebookId: String(item.notebook_id),
        userId: String(item.user_id),
        role: String(item.role) as SharedNotebookReviewDetail['members'][number]['role'],
        createdAt: String(item.created_at),
      })),
      canEdit: true,
      canManageMembers: true,
      auditByItem,
    } satisfies SharedNotebookReviewDetail,
  };
}

async function insertAuditLog(input: {
  notebookId: string;
  itemId: string;
  action: SharedNotebookAuditItem['action'];
  fromStatus?: SharedNotebookReviewStatus | null;
  toStatus?: SharedNotebookReviewStatus | null;
  note?: string | null;
  changedBy?: string | null;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return;
  await db.from('shared_notebook_audit_logs').insert({
    notebook_id: input.notebookId,
    item_id: input.itemId,
    action: input.action,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    note: input.note?.trim() ? clamp(input.note, 320) : null,
    changed_by: input.changedBy ?? null,
  });
}

async function resolvePromotionNodeId(input: { sourceMeta: Record<string, unknown>; explicitNodeId?: string | null; universeId: string }) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return input.explicitNodeId ?? null;
  if (input.explicitNodeId) return input.explicitNodeId;
  const candidates = [
    typeof input.sourceMeta.nodeId === 'string' ? input.sourceMeta.nodeId : null,
  ].filter(Boolean) as string[];
  if (candidates[0]) return candidates[0];
  const nodeSlug = typeof input.sourceMeta.nodeSlug === 'string' ? input.sourceMeta.nodeSlug : null;
  if (!nodeSlug) return null;
  const { data } = await db.from('nodes').select('id').eq('universe_id', input.universeId).eq('slug', nodeSlug).maybeSingle();
  return data?.id ?? null;
}

async function makeUniqueGlossarySlug(universeId: string, term: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return slugify(term);
  const base = slugify(term);
  let next = base;
  let count = 2;
  while (true) {
    const { data } = await db.from('glossary_terms').select('id').eq('universe_id', universeId).eq('slug', next).maybeSingle();
    if (!data) return next;
    next = `${base}-${count}`;
    count += 1;
  }
}

export async function getSharedNotebookReview(input: { universeSlug: string; notebookIdOrSlug: string }) {
  const result = await getNotebookWithRole(input);
  return result?.notebook ?? null;
}

export async function listReviewQueue(input: {
  universeSlug: string;
  notebookId: string;
  status?: SharedNotebookReviewStatus | 'all';
  sourceType?: string;
  q?: string;
  limit?: number;
  cursor?: number;
}) {
  const result = await getNotebookWithRole({ universeSlug: input.universeSlug, notebookIdOrSlug: input.notebookId });
  if (!result?.ctx.session?.userId) return { items: [] as SharedNotebookReviewQueueItem[], nextCursor: null };
  if (isMockMode() || result.ctx.session.userId === 'dev-bypass') {
    return listMockReviewQueue({
      notebookId: result.notebook.id,
      userId: result.ctx.session.userId,
      status: input.status,
      sourceType: input.sourceType,
      q: input.q,
      limit: input.limit,
      cursor: input.cursor,
    });
  }
  const filtered = result.notebook.items
    .filter((item) => (input.status && input.status !== 'all' ? item.reviewStatus === input.status : true))
    .filter((item) => (input.sourceType && input.sourceType !== 'all' ? item.sourceType === input.sourceType : true))
    .filter((item) => {
      const q = input.q?.trim().toLowerCase();
      if (!q) return true;
      return [item.title ?? '', item.text, item.note ?? '', item.tags.join(' ')].join(' ').toLowerCase().includes(q);
    })
    .map((item) => ({ ...item, notebookTitle: result.notebook.title, notebookSlug: result.notebook.slug }));
  const limit = Math.max(1, Math.min(60, input.limit ?? 24));
  const cursor = Math.max(0, input.cursor ?? 0);
  return {
    items: filtered.slice(cursor, cursor + limit),
    nextCursor: cursor + limit < filtered.length ? cursor + limit : null,
  };
}

export async function updateReviewStatus(input: UpdateSharedNotebookReviewInput) {
  const result = await getNotebookWithRole({ universeSlug: input.universeSlug, notebookIdOrSlug: input.notebookId });
  if (!result?.ctx.session?.userId) throw new Error('forbidden');
  if (isMockMode() || result.ctx.session.userId === 'dev-bypass') {
    const item = updateMockSharedNotebookReview({ ...input, userId: result.ctx.session.userId });
    if (!item) throw new Error('forbidden');
    return item;
  }
  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('db_not_configured');
  const current = result.notebook.items.find((item) => item.id === input.itemId);
  if (!current) throw new Error('not_found');
  const reviewedAt = new Date().toISOString();
  const { data: item, error } = await db
    .from('shared_notebook_items')
    .update({
      review_status: input.toStatus,
      editorial_note: input.note?.trim() ? clamp(input.note, 320) : current.editorialNote,
      reviewed_by: result.ctx.session.userId,
      reviewed_at: reviewedAt,
    })
    .eq('id', input.itemId)
    .eq('notebook_id', result.notebook.id)
    .select('*')
    .maybeSingle();
  if (error || !item) throw new Error('update_failed');
  await insertAuditLog({
    notebookId: result.notebook.id,
    itemId: input.itemId,
    action: 'status_change',
    fromStatus: current.reviewStatus,
    toStatus: input.toStatus,
    note: input.note ?? null,
    changedBy: result.ctx.session.userId,
  });
  return item;
}

export async function getSharedItemAudit(input: { universeSlug: string; notebookId: string; itemId: string }) {
  const result = await getNotebookWithRole({ universeSlug: input.universeSlug, notebookIdOrSlug: input.notebookId });
  if (!result?.ctx.session?.userId) return [] as SharedNotebookAuditItem[];
  if (isMockMode() || result.ctx.session.userId === 'dev-bypass') return listMockSharedNotebookAudit(input.itemId);
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as SharedNotebookAuditItem[];
  const { data } = await db.from('shared_notebook_audit_logs').select('*').eq('item_id', input.itemId).order('created_at', { ascending: false }).limit(60);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    notebookId: String(row.notebook_id),
    itemId: String(row.item_id),
    action: String(row.action) as SharedNotebookAuditItem['action'],
    fromStatus: (typeof row.from_status === 'string' ? row.from_status : null) as SharedNotebookReviewStatus | null,
    toStatus: (typeof row.to_status === 'string' ? row.to_status : null) as SharedNotebookReviewStatus | null,
    note: typeof row.note === 'string' ? row.note : null,
    changedBy: typeof row.changed_by === 'string' ? row.changed_by : null,
    createdAt: String(row.created_at),
  }));
}

export async function listSharedNotebookReviewNodes(input: { universeSlug: string; notebookId: string }) {
  const result = await getNotebookWithRole({ universeSlug: input.universeSlug, notebookIdOrSlug: input.notebookId });
  if (!result) return [] as Array<{ id: string; title: string; slug: string }>;
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    return result.notebook.items
      .map((item) => ({ id: String(item.sourceMeta.nodeId ?? ''), title: String(item.sourceMeta.nodeTitle ?? item.sourceMeta.nodeSlug ?? ''), slug: String(item.sourceMeta.nodeSlug ?? '') }))
      .filter((item) => item.id || item.slug || item.title);
  }
  const { data } = await db.from('nodes').select('id, title, slug').eq('universe_id', result.notebook.universeId).order('title', { ascending: true }).limit(200);
  return (data ?? []).map((item) => ({ id: item.id, title: item.title, slug: item.slug }));
}

export async function promoteSharedItem(input: PromoteSharedNotebookItemInput) {
  const result = await getNotebookWithRole({ universeSlug: input.universeSlug, notebookIdOrSlug: input.notebookId });
  if (!result?.ctx.session?.userId) throw new Error('forbidden');
  const current = result.notebook.items.find((item) => item.id === input.itemId);
  if (!current) throw new Error('not_found');
  if (isMockMode() || result.ctx.session.userId === 'dev-bypass') {
    const promoted = promoteMockSharedNotebookItem({ ...input, userId: result.ctx.session.userId });
    if (!promoted) throw new Error('forbidden');
    return { promotedType: input.targetType, promotedId: promoted.promotedId, item: promoted.item };
  }
  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('db_not_configured');

  const nodeId = await resolvePromotionNodeId({ sourceMeta: current.sourceMeta, explicitNodeId: input.nodeId, universeId: result.notebook.universeId });
  const title = clamp(input.title?.trim() || current.title || current.text.slice(0, 80), 160);
  const summary = clamp(input.summary?.trim() || current.note || current.text, 500);
  let promotedId = '';

  if (input.targetType === 'evidence') {
    const { data, error } = await db
      .from('evidences')
      .insert({
        universe_id: result.notebook.universeId,
        node_id: nodeId,
        document_id: typeof current.sourceMeta.docId === 'string' ? current.sourceMeta.docId : typeof current.sourceMeta.originalDocId === 'string' ? current.sourceMeta.originalDocId : null,
        chunk_id: typeof current.sourceMeta.chunkId === 'string' ? current.sourceMeta.chunkId : typeof current.sourceMeta.originalChunkId === 'string' ? current.sourceMeta.originalChunkId : null,
        title,
        summary,
        confidence: 0.5,
        source_url: typeof current.sourceMeta.sourceUrl === 'string' ? current.sourceMeta.sourceUrl : null,
        curated: true,
        status: 'draft',
        editorial_note: clamp(input.note?.trim() || current.editorialNote || 'Promovido da fila coletiva.', 320),
        reviewed_by: result.ctx.session.userId,
        tags: current.tags,
      })
      .select('id')
      .maybeSingle();
    if (error || !data) throw new Error('promotion_failed');
    promotedId = data.id;
  }

  if (input.targetType === 'node_question') {
    if (!nodeId) throw new Error('node_required');
    const { data, error } = await db
      .from('node_questions')
      .insert({
        universe_id: result.notebook.universeId,
        node_id: nodeId,
        question: clamp(input.summary?.trim() || current.title || current.text, 240),
        pin_rank: 100,
        created_by: result.ctx.session.userId,
      })
      .select('id')
      .maybeSingle();
    if (error || !data) throw new Error('promotion_failed');
    promotedId = data.id;
  }

  if (input.targetType === 'glossary_term') {
    const { data, error } = await db
      .from('glossary_terms')
      .insert({
        universe_id: result.notebook.universeId,
        term: title,
        slug: await makeUniqueGlossarySlug(result.notebook.universeId, title),
        short_def: clamp(summary, 220),
        body: clamp(current.text, 1200),
        tags: current.tags,
        node_id: nodeId,
        created_by: result.ctx.session.userId,
      })
      .select('id')
      .maybeSingle();
    if (error || !data) throw new Error('promotion_failed');
    promotedId = data.id;
  }

  if (input.targetType === 'event') {
    const { data, error } = await db
      .from('events')
      .insert({
        universe_id: result.notebook.universeId,
        node_id: nodeId,
        evidence_id: current.promotedType === 'evidence' ? current.promotedId : null,
        document_id: typeof current.sourceMeta.docId === 'string' ? current.sourceMeta.docId : typeof current.sourceMeta.originalDocId === 'string' ? current.sourceMeta.originalDocId : null,
        title,
        summary,
        event_date: input.eventDate?.trim() || null,
        period_label: 'Draft coletivo',
      })
      .select('id')
      .maybeSingle();
    if (error || !data) throw new Error('promotion_failed');
    promotedId = data.id;
  }

  const reviewedAt = new Date().toISOString();
  const { error: updateError } = await db
    .from('shared_notebook_items')
    .update({
      review_status: 'approved',
      editorial_note: input.note?.trim() ? clamp(input.note, 320) : current.editorialNote,
      reviewed_by: result.ctx.session.userId,
      reviewed_at: reviewedAt,
      promoted_type: input.targetType,
      promoted_id: promotedId,
    })
    .eq('id', current.id)
    .eq('notebook_id', result.notebook.id);
  if (updateError) throw new Error('promotion_update_failed');

  await insertAuditLog({
    notebookId: result.notebook.id,
    itemId: current.id,
    action: 'promote',
    fromStatus: current.reviewStatus,
    toStatus: 'approved',
    note: input.note ?? `Promovido para ${input.targetType}`,
    changedBy: result.ctx.session.userId,
  });

  return { promotedType: input.targetType, promotedId, itemId: current.id };
}


