import { randomUUID } from 'crypto';
import type {
  AddSharedNotebookItemInput,
  CreateSharedNotebookInput,
  PromoteSharedNotebookItemInput,
  SharedNotebookAuditItem,
  SharedNotebookDetail,
  SharedNotebookItem,
  SharedNotebookMember,
  SharedNotebookReviewDetail,
  SharedNotebookReviewQueueItem,
  SharedNotebookReviewStatus,
  SharedNotebookRole,
  SharedNotebookSourceType,
  SharedNotebookSummary,
  SharedNotebookVisibility,
  UpdateSharedNotebookReviewInput,
} from '@/lib/shared-notebooks/types';
import { canEditSharedNotebook, canManageSharedNotebookMembers, canReadSharedNotebook } from '@/lib/shared-notebooks/access';

const EMPTY_TEMPLATE_META = {
  suggestedTags: [] as string[],
  preferredSources: [] as SharedNotebookSourceType[],
  microcopy: '',
};

type SharedNotebookMockState = {
  notebooks: Array<Omit<SharedNotebookSummary, 'memberRole' | 'itemCount'>>;
  members: SharedNotebookMember[];
  items: SharedNotebookItem[];
  auditLogs: SharedNotebookAuditItem[];
};

const sharedNotebookMockState = (globalThis as typeof globalThis & { __cvSharedNotebookMockState?: SharedNotebookMockState }).__cvSharedNotebookMockState ?? {
  notebooks: [],
  members: [],
  items: [],
  auditLogs: [],
};

(globalThis as typeof globalThis & { __cvSharedNotebookMockState?: SharedNotebookMockState }).__cvSharedNotebookMockState = sharedNotebookMockState;

const { notebooks, members, items, auditLogs } = sharedNotebookMockState;

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'coletivo';
}

function clamp(value: string, max: number) {
  const clean = String(value ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

function tagList(tags?: string[]) {
  return Array.from(new Set((tags ?? []).map((tag) => clamp(tag, 32).toLowerCase()).filter(Boolean))).slice(0, 12);
}

function normalizeTemplateMeta(meta: unknown) {
  const source = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {};
  return {
    suggestedTags: Array.isArray(source.suggestedTags) ? source.suggestedTags.map((tag) => String(tag)) : [],
    preferredSources: Array.isArray(source.preferredSources) ? source.preferredSources.map((value) => String(value) as SharedNotebookSourceType) : [],
    microcopy: typeof source.microcopy === 'string' ? source.microcopy : '',
  };
}

function memberRole(notebookId: string, userId?: string | null) {
  if (!userId) return null;
  return members.find((item) => item.notebookId === notebookId && item.userId === userId)?.role ?? null;
}

function itemCount(notebookId: string) {
  return items.filter((item) => item.notebookId === notebookId).length;
}

function auditForItem(itemId: string) {
  return auditLogs.filter((item) => item.itemId === itemId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function addAudit(input: {
  notebookId: string;
  itemId: string;
  action: SharedNotebookAuditItem['action'];
  fromStatus?: SharedNotebookReviewStatus | null;
  toStatus?: SharedNotebookReviewStatus | null;
  note?: string | null;
  changedBy?: string | null;
}) {
  auditLogs.unshift({
    id: randomUUID(),
    notebookId: input.notebookId,
    itemId: input.itemId,
    action: input.action,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    note: input.note ? clamp(input.note, 320) : null,
    changedBy: input.changedBy ?? null,
    createdAt: new Date().toISOString(),
  });
}

export function listMockSharedNotebooks(input: { universeSlug: string; userId?: string | null; isUniversePublished: boolean }) {
  return notebooks
    .filter((item) => item.universeSlug === input.universeSlug)
    .filter((item) =>
      canReadSharedNotebook({
        visibility: item.visibility,
        isUniversePublished: input.isUniversePublished,
        memberRole: memberRole(item.id, input.userId),
      }),
    )
    .map((item) => ({
      ...item,
      memberRole: memberRole(item.id, input.userId),
      itemCount: itemCount(item.id),
      templateMeta: normalizeTemplateMeta(item.templateMeta),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listMockAvailableNotebooks(input: { universeSlug: string; userId: string; isUniversePublished: boolean }) {
  return listMockSharedNotebooks(input).filter((item) => canEditSharedNotebook(item.memberRole));
}

export function createMockSharedNotebook(input: CreateSharedNotebookInput & { universeId: string; userId: string }) {
  const now = new Date().toISOString();
  const baseSlug = slugify(input.title);
  const templateMeta = normalizeTemplateMeta(input.templateMeta ?? EMPTY_TEMPLATE_META);
  let nextSlug = baseSlug;
  let count = 2;
  while (notebooks.some((item) => item.universeSlug === input.universeSlug && item.slug === nextSlug)) {
    nextSlug = `${baseSlug}-${count}`;
    count += 1;
  }
  const notebook = {
    id: randomUUID(),
    universeId: input.universeId,
    universeSlug: input.universeSlug,
    title: clamp(input.title, 120),
    slug: nextSlug,
    summary: input.summary ? clamp(input.summary, 240) : null,
    visibility: (input.visibility ?? 'team') as SharedNotebookVisibility,
    templateId: input.templateId ?? null,
    templateMeta,
    createdBy: input.userId,
    createdAt: now,
    updatedAt: now,
  };
  notebooks.unshift(notebook);
  members.unshift({ id: randomUUID(), notebookId: notebook.id, userId: input.userId, role: 'owner', createdAt: now });
  return {
    ...notebook,
    memberRole: 'owner' as SharedNotebookRole,
    itemCount: 0,
    templateMeta,
  } satisfies SharedNotebookSummary;
}

export function getMockSharedNotebook(input: {
  universeSlug: string;
  notebookIdOrSlug: string;
  userId?: string | null;
  isUniversePublished: boolean;
}) {
  const notebook = notebooks.find((item) => item.universeSlug === input.universeSlug && (item.id === input.notebookIdOrSlug || item.slug === input.notebookIdOrSlug));
  if (!notebook) return null;
  const role = memberRole(notebook.id, input.userId);
  if (!canReadSharedNotebook({ visibility: notebook.visibility, isUniversePublished: input.isUniversePublished, memberRole: role })) return null;
  return {
    ...notebook,
    memberRole: role,
    itemCount: itemCount(notebook.id),
    templateMeta: normalizeTemplateMeta(notebook.templateMeta),
    items: items.filter((item) => item.notebookId === notebook.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    members: members.filter((item) => item.notebookId === notebook.id),
    canEdit: canEditSharedNotebook(role),
    canManageMembers: canManageSharedNotebookMembers(role),
  } satisfies SharedNotebookDetail;
}

export function getMockSharedNotebookReview(input: {
  universeSlug: string;
  notebookIdOrSlug: string;
  userId?: string | null;
  isUniversePublished: boolean;
}) {
  const notebook = getMockSharedNotebook(input);
  if (!notebook) return null;
  return {
    ...notebook,
    auditByItem: Object.fromEntries(notebook.items.map((item) => [item.id, auditForItem(item.id)])),
  } satisfies SharedNotebookReviewDetail;
}

export function listMockReviewQueue(input: {
  notebookId: string;
  userId: string;
  status?: SharedNotebookReviewStatus | 'all';
  sourceType?: string;
  q?: string;
  limit?: number;
  cursor?: number;
}) {
  const role = memberRole(input.notebookId, input.userId);
  if (!canEditSharedNotebook(role)) return { items: [] as SharedNotebookReviewQueueItem[], nextCursor: null };
  const notebook = notebooks.find((item) => item.id === input.notebookId);
  if (!notebook) return { items: [] as SharedNotebookReviewQueueItem[], nextCursor: null };
  const q = input.q?.trim().toLowerCase() ?? '';
  const filtered = items
    .filter((item) => item.notebookId === input.notebookId)
    .filter((item) => (input.status && input.status !== 'all' ? item.reviewStatus === input.status : true))
    .filter((item) => (input.sourceType && input.sourceType !== 'all' ? item.sourceType === input.sourceType : true))
    .filter((item) => {
      if (!q) return true;
      return [item.title ?? '', item.text, item.note ?? '', item.tags.join(' ')].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({ ...item, notebookTitle: notebook.title, notebookSlug: notebook.slug }));
  const limit = Math.max(1, Math.min(60, input.limit ?? 24));
  const cursor = Math.max(0, input.cursor ?? 0);
  return {
    items: filtered.slice(cursor, cursor + limit),
    nextCursor: cursor + limit < filtered.length ? cursor + limit : null,
  };
}

export function addMockSharedNotebookItem(input: AddSharedNotebookItemInput & { universeId: string; userId: string; addedByLabel?: string }) {
  const notebook = notebooks.find((item) => item.id === input.notebookId);
  if (!notebook) return null;
  const role = memberRole(notebook.id, input.userId);
  if (!canEditSharedNotebook(role)) return null;
  const now = new Date().toISOString();
  const item: SharedNotebookItem = {
    id: randomUUID(),
    notebookId: notebook.id,
    universeId: input.universeId,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    sourceMeta: input.sourceMeta ?? {},
    title: input.title ? clamp(input.title, 160) : null,
    text: clamp(input.text, 1200),
    tags: tagList(input.tags),
    note: input.note ? clamp(input.note, 320) : null,
    addedBy: input.userId,
    addedByLabel: input.addedByLabel ?? 'Usuario',
    reviewStatus: 'draft',
    editorialNote: null,
    reviewedBy: null,
    reviewedAt: null,
    promotedType: null,
    promotedId: null,
    createdAt: now,
  };
  items.unshift(item);
  notebook.updatedAt = now;
  addAudit({ notebookId: notebook.id, itemId: item.id, action: 'create', toStatus: 'draft', changedBy: input.userId });
  return item;
}

export function updateMockSharedNotebookReview(input: UpdateSharedNotebookReviewInput & { userId: string }) {
  const role = memberRole(input.notebookId, input.userId);
  if (!canEditSharedNotebook(role)) return null;
  const item = items.find((entry) => entry.id === input.itemId && entry.notebookId === input.notebookId);
  if (!item) return null;
  const fromStatus = item.reviewStatus;
  item.reviewStatus = input.toStatus;
  item.editorialNote = input.note ? clamp(input.note, 320) : item.editorialNote;
  item.reviewedBy = input.userId;
  item.reviewedAt = new Date().toISOString();
  addAudit({
    notebookId: input.notebookId,
    itemId: input.itemId,
    action: 'status_change',
    fromStatus,
    toStatus: input.toStatus,
    note: input.note ?? null,
    changedBy: input.userId,
  });
  return item;
}

export function promoteMockSharedNotebookItem(input: PromoteSharedNotebookItemInput & { userId: string }) {
  const role = memberRole(input.notebookId, input.userId);
  if (!canEditSharedNotebook(role)) return null;
  const item = items.find((entry) => entry.id === input.itemId && entry.notebookId === input.notebookId);
  if (!item) return null;
  const fromStatus = item.reviewStatus;
  item.reviewStatus = 'approved';
  item.editorialNote = input.note ? clamp(input.note, 320) : item.editorialNote;
  item.reviewedBy = input.userId;
  item.reviewedAt = new Date().toISOString();
  item.promotedType = input.targetType;
  item.promotedId = randomUUID();
  addAudit({
    notebookId: input.notebookId,
    itemId: input.itemId,
    action: 'promote',
    fromStatus,
    toStatus: 'approved',
    note: input.note ?? `Promovido para ${input.targetType}`,
    changedBy: input.userId,
  });
  return { item, promotedId: item.promotedId };
}

export function removeMockSharedNotebookItem(input: { notebookId: string; itemId: string; userId: string }) {
  const role = memberRole(input.notebookId, input.userId);
  if (!canEditSharedNotebook(role)) return false;
  const index = items.findIndex((item) => item.notebookId === input.notebookId && item.id === input.itemId);
  if (index < 0) return false;
  items.splice(index, 1);
  addAudit({ notebookId: input.notebookId, itemId: input.itemId, action: 'remove', changedBy: input.userId });
  const notebook = notebooks.find((entry) => entry.id === input.notebookId);
  if (notebook) notebook.updatedAt = new Date().toISOString();
  return true;
}

export function listMockSharedNotebookAudit(itemId: string) {
  return auditForItem(itemId);
}
