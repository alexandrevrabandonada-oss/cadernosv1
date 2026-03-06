import { describe, expect, it } from 'vitest';
import {
  canCreateSharedNotebook,
  canEditSharedNotebook,
  canManageSharedNotebookMembers,
  canReadSharedNotebook,
} from '@/lib/shared-notebooks/access';

describe('shared notebook access', () => {
  it('allows public read only when the universe is published', () => {
    expect(canReadSharedNotebook({ visibility: 'public', isUniversePublished: true, memberRole: null })).toBe(true);
    expect(canReadSharedNotebook({ visibility: 'public', isUniversePublished: false, memberRole: null })).toBe(false);
  });

  it('allows team/private read for members', () => {
    expect(canReadSharedNotebook({ visibility: 'team', isUniversePublished: false, memberRole: 'viewer' })).toBe(true);
    expect(canReadSharedNotebook({ visibility: 'private', isUniversePublished: false, memberRole: 'editor' })).toBe(true);
    expect(canReadSharedNotebook({ visibility: 'team', isUniversePublished: true, memberRole: null })).toBe(false);
  });

  it('limits editing and member management to owner/editor', () => {
    expect(canEditSharedNotebook('owner')).toBe(true);
    expect(canEditSharedNotebook('editor')).toBe(true);
    expect(canEditSharedNotebook('viewer')).toBe(false);
    expect(canManageSharedNotebookMembers('owner')).toBe(true);
    expect(canManageSharedNotebookMembers('editor')).toBe(true);
    expect(canManageSharedNotebookMembers('viewer')).toBe(false);
  });

  it('only allows logged users to create shared notebooks', () => {
    expect(canCreateSharedNotebook('user-1')).toBe(true);
    expect(canCreateSharedNotebook(null)).toBe(false);
  });
});
