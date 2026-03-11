import { randomUUID } from 'crypto';
import type { UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';

export type BootstrappedMockUniverse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  published: boolean;
  publishedAt: string | null;
  isFeatured: boolean;
  featuredRank: number;
  focusNote: string | null;
  focusOverride: boolean;
  templateId: UniverseBootstrapTemplateId | null;
  sourceUniverseId: string | null;
  coreNodes: Array<{
    id: string;
    slug: string;
    title: string;
    kind: 'concept' | 'event' | 'person' | 'question';
    summary: string;
    tags: string[];
  }>;
  glossaryCount: number;
  trailCount: number;
  questionCount: number;
  collectiveTemplateCount: number;
  createdAt: string;
  updatedAt: string;
};

type BootstrappedMockState = {
  universes: BootstrappedMockUniverse[];
};

const state =
  (globalThis as typeof globalThis & { __cvBootstrapUniverseMockState?: BootstrappedMockState }).__cvBootstrapUniverseMockState ??
  { universes: [] };

(globalThis as typeof globalThis & { __cvBootstrapUniverseMockState?: BootstrappedMockState }).__cvBootstrapUniverseMockState = state;

function cloneUniverse(item: BootstrappedMockUniverse) {
  return {
    ...item,
    coreNodes: item.coreNodes.map((node) => ({ ...node, tags: [...node.tags] })),
  };
}

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

export function listBootstrappedMockUniverses() {
  return state.universes.map(cloneUniverse);
}

export function getBootstrappedMockUniverseBySlug(slug: string) {
  const found = state.universes.find((item) => item.slug === slug);
  return found ? cloneUniverse(found) : null;
}

export function getBootstrappedMockUniverseById(id: string) {
  const found = state.universes.find((item) => item.id === id);
  return found ? cloneUniverse(found) : null;
}

export function createMockUniverseRecord(input: {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  published?: boolean;
  publishedAt?: string | null;
}) {
  const existing = state.universes.find((item) => item.slug === input.slug);
  if (existing) return cloneUniverse(existing);

  const now = new Date().toISOString();
  const created: BootstrappedMockUniverse = {
    id: input.id ?? `mock-${input.slug}-${randomUUID()}`,
    slug: input.slug,
    title: input.title || titleFromSlug(input.slug) || 'Universo',
    summary: input.summary || 'Universo em preparacao.',
    published: Boolean(input.published ?? false),
    publishedAt: input.published ? input.publishedAt ?? now : null,
    isFeatured: false,
    featuredRank: 0,
    focusNote: null,
    focusOverride: false,
    templateId: null,
    sourceUniverseId: null,
    coreNodes: [],
    glossaryCount: 0,
    trailCount: 0,
    questionCount: 0,
    collectiveTemplateCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  state.universes.unshift(created);
  return cloneUniverse(created);
}

export function upsertBootstrappedMockUniverse(
  input: Partial<BootstrappedMockUniverse> & Pick<BootstrappedMockUniverse, 'id' | 'slug'>,
) {
  const existing = state.universes.find((item) => item.id === input.id || item.slug === input.slug);
  const now = new Date().toISOString();
  if (!existing) {
    const created: BootstrappedMockUniverse = {
      id: input.id,
      slug: input.slug,
      title: input.title ?? titleFromSlug(input.slug) ?? 'Universo',
      summary: input.summary ?? 'Universo em preparacao.',
      published: Boolean(input.published ?? false),
      publishedAt: input.published ? input.publishedAt ?? now : null,
      isFeatured: Boolean(input.isFeatured ?? false),
      featuredRank: Number(input.featuredRank ?? 0),
      focusNote: input.focusNote ?? null,
      focusOverride: Boolean(input.focusOverride ?? false),
      templateId: input.templateId ?? null,
      sourceUniverseId: input.sourceUniverseId ?? null,
      coreNodes: (input.coreNodes ?? []).map((node) => ({ ...node, tags: [...node.tags] })),
      glossaryCount: Number(input.glossaryCount ?? 0),
      trailCount: Number(input.trailCount ?? 0),
      questionCount: Number(input.questionCount ?? 0),
      collectiveTemplateCount: Number(input.collectiveTemplateCount ?? 0),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
    state.universes.unshift(created);
    return cloneUniverse(created);
  }

  Object.assign(existing, {
    ...input,
    updatedAt: now,
  });
  if (input.published === false) {
    existing.publishedAt = null;
  }
  if (input.coreNodes) {
    existing.coreNodes = input.coreNodes.map((node) => ({ ...node, tags: [...node.tags] }));
  }
  return cloneUniverse(existing);
}
