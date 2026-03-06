import type { SharedNotebookRole, SharedNotebookVisibility } from '@/lib/shared-notebooks/types';

export function canReadSharedNotebook(input: {
  visibility: SharedNotebookVisibility;
  isUniversePublished: boolean;
  memberRole?: SharedNotebookRole | null;
}) {
  if (input.memberRole) return true;
  return input.visibility === 'public' && input.isUniversePublished;
}

export function canEditSharedNotebook(role?: SharedNotebookRole | null) {
  return role === 'owner' || role === 'editor';
}

export function canManageSharedNotebookMembers(role?: SharedNotebookRole | null) {
  return role === 'owner' || role === 'editor';
}

export function canCreateSharedNotebook(userId?: string | null) {
  return Boolean(userId);
}
