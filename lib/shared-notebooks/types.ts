export type SharedNotebookVisibility = 'private' | 'team' | 'public';
export type SharedNotebookRole = 'owner' | 'editor' | 'viewer';
export type SharedNotebookSourceType = 'highlight' | 'note' | 'evidence' | 'thread' | 'event' | 'term' | 'node' | 'citation' | 'chunk' | 'doc';
export type SharedNotebookReviewStatus = 'draft' | 'review' | 'approved' | 'rejected';
export type SharedNotebookPromotedType = 'evidence' | 'node_question' | 'glossary_term' | 'event' | 'trail_step';
export type SharedNotebookTemplateId = 'blank' | 'weekly_base' | 'clipping' | 'study_group' | 'thematic_core';

export type SharedNotebookMember = {
  id: string;
  notebookId: string;
  userId: string;
  role: SharedNotebookRole;
  createdAt: string;
};

export type SharedNotebookSummary = {
  id: string;
  universeId: string;
  universeSlug: string;
  title: string;
  slug: string;
  summary: string | null;
  visibility: SharedNotebookVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberRole: SharedNotebookRole | null;
  itemCount: number;
  templateId: SharedNotebookTemplateId | null;
  templateMeta: { suggestedTags: string[]; preferredSources: SharedNotebookSourceType[]; microcopy: string };
};

export type SharedNotebookItem = {
  id: string;
  notebookId: string;
  universeId: string;
  sourceType: SharedNotebookSourceType;
  sourceId: string | null;
  sourceMeta: Record<string, unknown>;
  title: string | null;
  text: string;
  tags: string[];
  note: string | null;
  addedBy: string;
  addedByLabel: string;
  reviewStatus: SharedNotebookReviewStatus;
  editorialNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  promotedType: SharedNotebookPromotedType | null;
  promotedId: string | null;
  createdAt: string;
};

export type SharedNotebookAuditItem = {
  id: string;
  notebookId: string;
  itemId: string;
  action: 'create' | 'status_change' | 'edit' | 'promote' | 'remove';
  fromStatus: SharedNotebookReviewStatus | null;
  toStatus: SharedNotebookReviewStatus | null;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
};

export type SharedNotebookDetail = SharedNotebookSummary & {
  items: SharedNotebookItem[];
  members: SharedNotebookMember[];
  canEdit: boolean;
  canManageMembers: boolean;
};

export type SharedNotebookReviewQueueItem = SharedNotebookItem & {
  notebookTitle: string;
  notebookSlug: string;
};

export type SharedNotebookReviewDetail = SharedNotebookDetail & {
  auditByItem: Record<string, SharedNotebookAuditItem[]>;
};

export type CreateSharedNotebookInput = {
  universeSlug: string;
  title: string;
  summary?: string | null;
  visibility?: SharedNotebookVisibility;
  templateId?: SharedNotebookTemplateId | null;
  templateMeta?: Record<string, unknown> | null;
};

export type AddSharedNotebookItemInput = {
  notebookId: string;
  universeSlug: string;
  sourceType: SharedNotebookSourceType;
  sourceId?: string | null;
  sourceMeta?: Record<string, unknown>;
  title?: string | null;
  text: string;
  tags?: string[];
  note?: string | null;
};

export type UpdateSharedNotebookReviewInput = {
  universeSlug: string;
  notebookId: string;
  itemId: string;
  toStatus: SharedNotebookReviewStatus;
  note?: string | null;
};

export type PromoteSharedNotebookItemInput = {
  universeSlug: string;
  notebookId: string;
  itemId: string;
  targetType: SharedNotebookPromotedType;
  nodeId?: string | null;
  title?: string | null;
  summary?: string | null;
  note?: string | null;
  eventDate?: string | null;
};
