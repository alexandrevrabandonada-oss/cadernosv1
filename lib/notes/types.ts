export type NoteKind = 'highlight' | 'note';

export type NoteSourceType =
  | 'evidence'
  | 'thread'
  | 'citation'
  | 'chunk'
  | 'doc'
  | 'event'
  | 'term'
  | 'node';

export type UserNote = {
  id: string;
  universeId: string;
  universeSlug?: string;
  userId?: string | null;
  kind: NoteKind;
  title: string | null;
  text: string;
  sourceType: NoteSourceType;
  sourceId: string | null;
  sourceMeta: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pendingSync?: boolean;
};

export type CreateUserNoteInput = {
  universeSlug: string;
  kind: NoteKind;
  title?: string | null;
  text: string;
  sourceType: NoteSourceType;
  sourceId?: string | null;
  sourceMeta?: Record<string, unknown>;
  tags?: string[];
};

export type UpdateUserNoteInput = {
  id: string;
  title?: string | null;
  text?: string;
  tags?: string[];
};

export type NoteFilters = {
  kind?: NoteKind | 'all';
  sourceType?: NoteSourceType | 'all';
  q?: string;
  tags?: string[];
  limit?: number;
  cursor?: number;
};
