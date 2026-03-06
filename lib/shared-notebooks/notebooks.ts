import 'server-only';
import { randomUUID } from 'crypto';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { prepareNotebookExport, renderNotebookMarkdown, type NotebookExportItem } from '@/lib/export/notebook';
import { renderNotebookPdf } from '@/lib/export/notebookPdf';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { canCreateSharedNotebook, canEditSharedNotebook, canManageSharedNotebookMembers, canReadSharedNotebook } from '@/lib/shared-notebooks/access';
import {
  addMockSharedNotebookItem,
  createMockSharedNotebook,
  getMockSharedNotebook,
  listMockAvailableNotebooks,
  listMockSharedNotebooks,
  removeMockSharedNotebookItem,
} from '@/lib/shared-notebooks/mock';
import { applyNotebookTemplate, getNotebookTemplate } from '@/lib/shared-notebooks/templates';
import type {
  AddSharedNotebookItemInput,
  CreateSharedNotebookInput,
  SharedNotebookDetail,
  SharedNotebookItem,
  SharedNotebookMember,
  SharedNotebookPromotedType,
  SharedNotebookReviewStatus,
  SharedNotebookSourceType,
  SharedNotebookSummary,
} from '@/lib/shared-notebooks/types';

function isMockMode() {
  return process.env.TEST_SEED === '1' || !getSupabaseServiceRoleClient();
}

function normalizeSessionUser() {
  return getCurrentSession();
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

function compatibilityScore(sourceType: SharedNotebookSourceType, preferredSources: SharedNotebookSourceType[]) {
  const index = preferredSources.indexOf(sourceType);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

async function getContext(universeSlug: string) {
  const [session, access] = await Promise.all([normalizeSessionUser(), getUniverseAccessBySlug(universeSlug)]);
  if (!access.universe) return null;
  if (!access.published && !access.canPreview) return null;
  return { session, access, universe: access.universe };
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'coletivo';
}

async function createSignedUrl(path: string) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data } = await db.storage.from('cv-exports').createSignedUrl(path, 60 * 60 * 8);
  return data?.signedUrl ?? null;
}

async function ensureExportsBucket() {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data: bucket } = await db.storage.getBucket('cv-exports');
  if (bucket) return db;
  await db.storage.createBucket('cv-exports', {
    public: false,
    fileSizeLimit: '20MB',
    allowedMimeTypes: ['application/pdf', 'text/markdown'],
  });
  return db;
}

async function uploadExportFile(input: { path: string; contentType: string; body: string | Buffer }) {
  const db = await ensureExportsBucket();
  if (!db) throw new Error('storage_unavailable');
  const payload = typeof input.body === 'string' ? Buffer.from(input.body, 'utf-8') : input.body;
  const { error } = await db.storage.from('cv-exports').upload(input.path, payload, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) throw new Error('storage_upload_failed');
}

async function insertSharedNotebookAuditLog(input: {
  notebookId: string;
  itemId: string;
  action: 'create' | 'status_change' | 'edit' | 'promote' | 'remove';
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

function buildExportPath(input: { universeId: string; notebookId: string; extension: 'md' | 'pdf' }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `universes/${input.universeId}/shared-notebook/${input.notebookId}/${stamp}-${randomUUID()}.${input.extension}`;
}

function mapSharedItemToExport(slug: string, item: SharedNotebookItem): NotebookExportItem {
  const kind = item.sourceType === 'note' ? 'note' : 'highlight';
  const originalSourceType = typeof item.sourceMeta.originalSourceType === 'string' ? item.sourceMeta.originalSourceType : item.sourceType;
  const originalSourceId = typeof item.sourceMeta.originalSourceId === 'string' ? item.sourceMeta.originalSourceId : item.sourceId;
  return {
    kind,
    title: item.title,
    text: item.note ? `${item.text}\n\nNota coletiva: ${item.note}` : item.text,
    tags: item.tags,
    source: {
      type: (originalSourceType === 'highlight' || originalSourceType === 'note' ? (typeof item.sourceMeta.sourceType === 'string' ? item.sourceMeta.sourceType : 'doc') : originalSourceType) as NotebookExportItem['source']['type'],
      id: originalSourceId,
      meta: item.sourceMeta,
    },
    linkToApp: typeof item.sourceMeta.linkToApp === 'string' ? item.sourceMeta.linkToApp : `/c/${slug}/coletivos/${item.notebookId}`,
    createdAt: item.createdAt,
  };
}

export async function listSharedNotebooks(universeSlug: string) {
  const ctx = await getContext(universeSlug);
  if (!ctx) return { items: [] as SharedNotebookSummary[], canCreate: false };
  const userId = ctx.session?.userId ?? null;
  if (isMockMode() || userId === 'dev-bypass') {
    return {
      items: listMockSharedNotebooks({ universeSlug, userId, isUniversePublished: ctx.access.published }),
      canCreate: canCreateSharedNotebook(userId),
    };
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return { items: [] as SharedNotebookSummary[], canCreate: false };

  const { data: notebooks } = await db.from('shared_notebooks').select('*').eq('universe_id', ctx.universe.id).order('updated_at', { ascending: false }).limit(80);
  const notebookIds = (notebooks ?? []).map((item) => item.id);
  const [{ data: memberships }, { data: itemCounts }] = await Promise.all([
    notebookIds.length > 0 ? db.from('shared_notebook_members').select('notebook_id, user_id, role').in('notebook_id', notebookIds) : Promise.resolve({ data: [] }),
    notebookIds.length > 0 ? db.from('shared_notebook_items').select('notebook_id').in('notebook_id', notebookIds) : Promise.resolve({ data: [] }),
  ]);
  const roleByNotebook = new Map<string, string>();
  for (const item of memberships ?? []) {
    if (item.user_id === userId) roleByNotebook.set(item.notebook_id, item.role);
  }
  const counts = new Map<string, number>();
  for (const row of itemCounts ?? []) counts.set(row.notebook_id, (counts.get(row.notebook_id) ?? 0) + 1);
  const items = (notebooks ?? [])
    .filter((item) =>
      canReadSharedNotebook({
        visibility: item.visibility,
        isUniversePublished: ctx.access.published,
        memberRole: (roleByNotebook.get(item.id) as SharedNotebookSummary['memberRole']) ?? null,
      }),
    )
    .map((item) => ({
      id: item.id,
      universeId: item.universe_id,
      universeSlug,
      title: item.title,
      slug: item.slug,
      summary: item.summary ?? null,
      visibility: item.visibility,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      memberRole: (roleByNotebook.get(item.id) as SharedNotebookSummary['memberRole']) ?? null,
      itemCount: counts.get(item.id) ?? 0,
      templateId: typeof item.meta?.templateId === 'string' ? item.meta.templateId : null,
      templateMeta: normalizeTemplateMeta((item.meta ?? null) as Record<string, unknown> | null),
    })) as SharedNotebookSummary[];
  return { items, canCreate: canCreateSharedNotebook(userId) };
}

export async function listAvailableNotebooksForUser(universeSlug: string, sourceType?: SharedNotebookSourceType | null) {
  const ctx = await getContext(universeSlug);
  if (!ctx?.session?.userId) return [] as SharedNotebookSummary[];
  if (isMockMode() || ctx.session.userId === 'dev-bypass') {
    const items = listMockAvailableNotebooks({ universeSlug, userId: ctx.session.userId, isUniversePublished: ctx.access.published });
    return sourceType ? [...items].sort((a, b) => compatibilityScore(sourceType, a.templateMeta.preferredSources) - compatibilityScore(sourceType, b.templateMeta.preferredSources)) : items;
  }
  const listed = await listSharedNotebooks(universeSlug);
  const items = listed.items.filter((item) => canEditSharedNotebook(item.memberRole));
  return sourceType ? [...items].sort((a, b) => compatibilityScore(sourceType, a.templateMeta.preferredSources) - compatibilityScore(sourceType, b.templateMeta.preferredSources)) : items;
}

export async function createSharedNotebook(input: CreateSharedNotebookInput) {
  const ctx = await getContext(input.universeSlug);
  if (!ctx?.session?.userId) throw new Error('unauthorized');
  const template = getNotebookTemplate(input.templateId ?? null);
  const applied = applyNotebookTemplate(template, {
    title: input.title,
    summary: input.summary ?? null,
    visibility: input.visibility ?? null,
  });
  const templateMeta = normalizeTemplateMeta({ ...applied.templateMeta, ...(input.templateMeta ?? {}) });
  if (isMockMode() || ctx.session.userId === 'dev-bypass') {
    return createMockSharedNotebook({
      universeSlug: input.universeSlug,
      universeId: ctx.universe.id,
      userId: ctx.session.userId,
      title: applied.title,
      summary: applied.summary ?? null,
      visibility: applied.visibility,
      templateId: applied.templateId,
      templateMeta,
    });
  }
  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('db_not_configured');
  const now = new Date().toISOString();
  const baseSlug = slugify(applied.title);
  let nextSlug = baseSlug;
  let count = 2;
  while (true) {
    const { data: exists } = await db.from('shared_notebooks').select('id').eq('universe_id', ctx.universe.id).eq('slug', nextSlug).maybeSingle();
    if (!exists) break;
    nextSlug = `${baseSlug}-${count}`;
    count += 1;
  }
  const { data: notebook, error } = await db
    .from('shared_notebooks')
    .insert({
      universe_id: ctx.universe.id,
      title: clamp(applied.title, 120),
      slug: nextSlug,
      summary: applied.summary ? clamp(applied.summary, 240) : null,
      visibility: applied.visibility,
      meta: { templateId: applied.templateId, ...templateMeta },
      created_by: ctx.session.userId,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .maybeSingle();
  if (error || !notebook) throw new Error('create_failed');
  await db.from('shared_notebook_members').insert({ notebook_id: notebook.id, user_id: ctx.session.userId, role: 'owner' });
  return {
    id: notebook.id,
    universeId: notebook.universe_id,
    universeSlug: input.universeSlug,
    title: notebook.title,
    slug: notebook.slug,
    summary: notebook.summary ?? null,
    visibility: notebook.visibility,
    createdBy: notebook.created_by,
    createdAt: notebook.created_at,
    updatedAt: notebook.updated_at,
    memberRole: 'owner',
    itemCount: 0,
    templateId: typeof notebook.meta?.templateId === 'string' ? notebook.meta.templateId : applied.templateId,
    templateMeta,
  } satisfies SharedNotebookSummary;
}

export async function getSharedNotebook(input: { universeSlug: string; notebookIdOrSlug: string }) {
  const ctx = await getContext(input.universeSlug);
  if (!ctx) return null;
  const userId = ctx.session?.userId ?? null;
  if (isMockMode() || userId === 'dev-bypass') {
    return getMockSharedNotebook({ universeSlug: input.universeSlug, notebookIdOrSlug: input.notebookIdOrSlug, userId, isUniversePublished: ctx.access.published });
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
  const [{ data: memberships }, { data: itemRows }] = await Promise.all([
    db.from('shared_notebook_members').select('*').eq('notebook_id', notebook.id),
    db.from('shared_notebook_items').select('*').eq('notebook_id', notebook.id).order('created_at', { ascending: false }),
  ]);
  const role = (memberships ?? []).find((item) => item.user_id === userId)?.role ?? null;
  if (!canReadSharedNotebook({ visibility: notebook.visibility, isUniversePublished: ctx.access.published, memberRole: role })) return null;
  return {
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
      sourceType: item.source_type as SharedNotebookItem['sourceType'],
      sourceId: typeof item.source_id === 'string' ? item.source_id : null,
      sourceMeta: (item.source_meta ?? {}) as Record<string, unknown>,
      title: typeof item.title === 'string' ? item.title : null,
      text: String(item.text),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
      note: typeof item.note === 'string' ? item.note : null,
      addedBy: String(item.added_by),
      addedByLabel: typeof (item.source_meta as Record<string, unknown> | null)?.addedByLabel === 'string' ? String((item.source_meta as Record<string, unknown>).addedByLabel) : 'Usuario',
      reviewStatus: (item.review_status as SharedNotebookReviewStatus | null) ?? 'draft',
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
      role: item.role as SharedNotebookMember['role'],
      createdAt: String(item.created_at),
    })),
    canEdit: canEditSharedNotebook(role),
    canManageMembers: canManageSharedNotebookMembers(role),
  } satisfies SharedNotebookDetail;
}

export async function addItemToSharedNotebook(input: AddSharedNotebookItemInput) {
  const ctx = await getContext(input.universeSlug);
  if (!ctx?.session?.userId) throw new Error('unauthorized');
  if (isMockMode() || ctx.session.userId === 'dev-bypass') {
    const item = addMockSharedNotebookItem({ ...input, universeId: ctx.universe.id, userId: ctx.session.userId, addedByLabel: 'Usuario' });
    if (!item) throw new Error('forbidden');
    return item;
  }
  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('db_not_configured');
  const { data: membership } = await db.from('shared_notebook_members').select('role').eq('notebook_id', input.notebookId).eq('user_id', ctx.session.userId).maybeSingle();
  if (!canEditSharedNotebook((membership?.role as SharedNotebookSummary['memberRole']) ?? null)) throw new Error('forbidden');
  const now = new Date().toISOString();
  const { data: item, error } = await db
    .from('shared_notebook_items')
    .insert({
      notebook_id: input.notebookId,
      universe_id: ctx.universe.id,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      source_meta: input.sourceMeta ?? {},
      title: input.title ? clamp(input.title, 160) : null,
      text: clamp(input.text, 1200),
      tags: input.tags ?? [],
      note: input.note ? clamp(input.note, 320) : null,
      added_by: ctx.session.userId,
      review_status: 'draft',
      editorial_note: null,
      reviewed_by: null,
      reviewed_at: null,
      promoted_type: null,
      promoted_id: null,
      created_at: now,
    })
    .select('*')
    .maybeSingle();
  if (error || !item) throw new Error('insert_failed');
  await db.from('shared_notebooks').update({ updated_at: now }).eq('id', input.notebookId);
  await insertSharedNotebookAuditLog({ notebookId: input.notebookId, itemId: item.id, action: 'create', toStatus: 'draft', changedBy: ctx.session.userId });
  return {
    id: item.id,
    notebookId: item.notebook_id,
    universeId: item.universe_id,
    sourceType: item.source_type,
    sourceId: item.source_id,
    sourceMeta: (item.source_meta ?? {}) as Record<string, unknown>,
    title: item.title ?? null,
    text: item.text,
    tags: item.tags ?? [],
    note: item.note ?? null,
    addedBy: item.added_by,
    addedByLabel: 'Usuario',
    reviewStatus: (item.review_status as SharedNotebookReviewStatus | null) ?? 'draft',
    editorialNote: item.editorial_note ?? null,
    reviewedBy: item.reviewed_by ?? null,
    reviewedAt: item.reviewed_at ?? null,
    promotedType: item.promoted_type ? (item.promoted_type as SharedNotebookPromotedType) : null,
    promotedId: item.promoted_id ?? null,
    createdAt: item.created_at,
  } satisfies SharedNotebookItem;
}

export async function removeSharedNotebookItem(input: { universeSlug: string; notebookId: string; itemId: string }) {
  const ctx = await getContext(input.universeSlug);
  if (!ctx?.session?.userId) return false;
  if (isMockMode() || ctx.session.userId === 'dev-bypass') {
    return removeMockSharedNotebookItem({ notebookId: input.notebookId, itemId: input.itemId, userId: ctx.session.userId });
  }
  const db = getSupabaseServiceRoleClient();
  if (!db) return false;
  const { data: membership } = await db.from('shared_notebook_members').select('role').eq('notebook_id', input.notebookId).eq('user_id', ctx.session.userId).maybeSingle();
  if (!canEditSharedNotebook((membership?.role as SharedNotebookSummary['memberRole']) ?? null)) return false;
  await db.from('shared_notebook_items').delete().eq('id', input.itemId).eq('notebook_id', input.notebookId);
  await insertSharedNotebookAuditLog({ notebookId: input.notebookId, itemId: input.itemId, action: 'remove', changedBy: ctx.session.userId });
  await db.from('shared_notebooks').update({ updated_at: new Date().toISOString() }).eq('id', input.notebookId);
  return true;
}

export async function createSharedNotebookExport(input: { universeSlug: string; notebookIdOrSlug: string; format: 'md' | 'pdf' }) {
  const notebook = await getSharedNotebook({ universeSlug: input.universeSlug, notebookIdOrSlug: input.notebookIdOrSlug });
  const session = await getCurrentSession();
  if (!notebook || !session?.userId) throw new Error('forbidden');
  if (!canEditSharedNotebook(notebook.memberRole)) throw new Error('forbidden');
  if (process.env.TEST_SEED === '1') {
    const fakeId = `shared-notebook-${Date.now()}`;
    return {
      title: `Coletivo - ${notebook.title}`,
      kind: 'shared_notebook' as const,
      assets: [{ id: `${fakeId}-${input.format}`, format: input.format, path: `/mock/${fakeId}.${input.format}`, signedUrl: `https://example.local/${fakeId}.${input.format}` }],
    };
  }
  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('db_not_configured');
  const exportItems = notebook.items.map((item) => mapSharedItemToExport(input.universeSlug, item));
  const prepared = prepareNotebookExport({ slug: input.universeSlug, items: exportItems });
  if (prepared.items.length === 0) throw new Error('empty_notebook');
  const generatedAt = new Date().toISOString();
  const title = `Coletivo - ${notebook.title}`;
  const body =
    input.format === 'pdf'
      ? await renderNotebookPdf({
          universe: notebook.universeSlug,
          title,
          actorLabel: 'Coletivo',
          items: prepared.items,
          stats: prepared.stats,
          generatedAt,
          includeTagIndex: true,
        })
      : renderNotebookMarkdown({
          universe: notebook.universeSlug,
          title,
          actorLabel: 'Coletivo',
          items: prepared.items,
          stats: prepared.stats,
          generatedAt,
          includeTagIndex: true,
        });
  const storagePath = buildExportPath({ universeId: notebook.universeId, notebookId: notebook.id, extension: input.format });
  await uploadExportFile({ path: storagePath, contentType: input.format === 'pdf' ? 'application/pdf' : 'text/markdown; charset=utf-8', body });
  const { data: row, error } = await db
    .from('exports')
    .insert({
      universe_id: notebook.universeId,
      kind: 'shared_notebook',
      title,
      format: input.format,
      storage_path: storagePath,
      meta: { notebookId: notebook.id, notebookSlug: notebook.slug, visibility: notebook.visibility, itemCount: notebook.items.length },
      is_public: false,
      created_by: session.userId,
    })
    .select('id, format, storage_path')
    .maybeSingle();
  if (error || !row) throw new Error('insert_export_failed');
  return {
    title,
    kind: 'shared_notebook' as const,
    assets: [{ id: row.id, format: row.format, path: row.storage_path, signedUrl: await createSignedUrl(row.storage_path) }],
  };
}
