import 'server-only';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseMock } from '@/lib/mock/universe';
import { ensureQuickStartTrail } from '@/lib/onboarding/quickstart';
import { createMockSharedNotebook } from '@/lib/shared-notebooks/mock';
import { applyNotebookTemplate, getNotebookTemplate } from '@/lib/shared-notebooks/templates';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import {
  applyUniverseBootstrapTemplate,
  getUniverseBootstrapTemplate,
  type UniverseBootstrapTemplate,
  type UniverseBootstrapTemplateId,
} from '@/lib/universe/bootstrapTemplates';
import {
  createMockUniverseRecord,
  getBootstrappedMockUniverseById,
  listBootstrappedMockUniverses,
  upsertBootstrappedMockUniverse,
} from '@/lib/universe/bootstrapMock';

export type CloneUniverseStructureOptions = {
  nodes: boolean;
  glossary: boolean;
  trails: boolean;
  nodeQuestions: boolean;
  collectiveTemplates: boolean;
  homeEditorialDefaults: boolean;
};

export type CreateUniverseInput = {
  title: string;
  slug: string;
  summary: string;
  publishNow?: boolean;
};

export type BootstrapTemplateInput = {
  universeId: string;
  universeSlug: string;
  templateId: UniverseBootstrapTemplateId;
  userId?: string | null;
};

export type CloneUniverseInput = {
  sourceUniverseId: string;
  targetUniverseId: string;
  userId?: string | null;
  options: CloneUniverseStructureOptions;
};

type UniverseMeta = {
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
};

type SeedCounts = {
  nodes: number;
  glossary: number;
  questions: number;
  trails: number;
  collectiveTemplates: number;
};

const DEFAULT_CLONE_OPTIONS: CloneUniverseStructureOptions = {
  nodes: true,
  glossary: true,
  trails: true,
  nodeQuestions: true,
  collectiveTemplates: true,
  homeEditorialDefaults: false,
};

function shouldUseMockBootstrap() {
  return process.env.TEST_SEED === '1' || !getSupabaseServiceRoleClient();
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function getUniverseMeta(universeId: string): Promise<UniverseMeta | null> {
  if (shouldUseMockBootstrap()) {
    const mock = getBootstrappedMockUniverseById(universeId) ?? listBootstrappedMockUniverses().find((item) => item.id === universeId) ?? null;
    if (!mock) return null;
    return {
      id: mock.id,
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      published: mock.published,
      publishedAt: mock.publishedAt,
      isFeatured: mock.isFeatured,
      featuredRank: mock.featuredRank,
      focusNote: mock.focusNote,
      focusOverride: mock.focusOverride,
    };
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data } = await db
    .from('universes')
    .select('id, slug, title, summary, published, published_at, is_featured, featured_rank, focus_note, focus_override')
    .eq('id', universeId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    published: Boolean(data.published),
    publishedAt: data.published_at ?? null,
    isFeatured: Boolean(data.is_featured),
    featuredRank: Number(data.featured_rank ?? 0),
    focusNote: data.focus_note ?? null,
    focusOverride: Boolean(data.focus_override),
  };
}

export function normalizeCloneOptions(input?: Partial<CloneUniverseStructureOptions> | null): CloneUniverseStructureOptions {
  return {
    nodes: input?.nodes ?? DEFAULT_CLONE_OPTIONS.nodes,
    glossary: input?.glossary ?? DEFAULT_CLONE_OPTIONS.glossary,
    trails: input?.trails ?? DEFAULT_CLONE_OPTIONS.trails,
    nodeQuestions: input?.nodeQuestions ?? DEFAULT_CLONE_OPTIONS.nodeQuestions,
    collectiveTemplates: input?.collectiveTemplates ?? DEFAULT_CLONE_OPTIONS.collectiveTemplates,
    homeEditorialDefaults: input?.homeEditorialDefaults ?? DEFAULT_CLONE_OPTIONS.homeEditorialDefaults,
  };
}

export function buildBootstrapTemplateSnapshot(templateId: UniverseBootstrapTemplateId) {
  const template = getUniverseBootstrapTemplate(templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);
  return {
    nodes: template.seedNodes.map((node) => ({ ...node, tags: [...node.tags] })),
    glossary: template.seedGlossary.map((item) => ({ ...item, tags: [...item.tags], questionPrompts: [...(item.questionPrompts ?? [])] })),
    questions: template.seedQuestions.map((item) => ({ ...item })),
    trails: template.seedTrails.map((trail) => ({ ...trail, steps: trail.steps.map((step) => ({ ...step })) })),
    collectiveTemplateIds: [...template.seedCollectiveTemplates],
    opsDefaults: { ...template.opsDefaults },
  };
}

export function buildClonePreview(input: {
  source: { nodes?: number; glossary?: number; questions?: number; trails?: number; collectiveTemplates?: number; evidences?: number; exports?: number; analytics?: number };
  options?: Partial<CloneUniverseStructureOptions> | null;
}) {
  const options = normalizeCloneOptions(input.options);
  return {
    copied: {
      nodes: options.nodes ? input.source.nodes ?? 0 : 0,
      glossary: options.glossary ? input.source.glossary ?? 0 : 0,
      nodeQuestions: options.nodeQuestions ? input.source.questions ?? 0 : 0,
      trails: options.trails ? input.source.trails ?? 0 : 0,
      collectiveTemplates: options.collectiveTemplates ? input.source.collectiveTemplates ?? 0 : 0,
      homeEditorialDefaults: options.homeEditorialDefaults ? 1 : 0,
    },
    blocked: {
      evidences: input.source.evidences ?? 0,
      exports: input.source.exports ?? 0,
      analytics: input.source.analytics ?? 0,
      userNotes: 'never',
      studySessions: 'never',
    },
  };
}

export async function createUniverse(input: CreateUniverseInput) {
  const publishNow = Boolean(input.publishNow);
  if (shouldUseMockBootstrap()) {
    return createMockUniverseRecord({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      published: publishNow,
      publishedAt: publishNow ? new Date().toISOString() : null,
    });
  }

  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('Admin DB unavailable');
  const { data, error } = await db
    .from('universes')
    .insert({
      title: input.title,
      slug: input.slug,
      summary: input.summary || 'Resumo inicial do universo.',
      published: publishNow,
      published_at: publishNow ? new Date().toISOString() : null,
      is_featured: false,
      featured_rank: 0,
      focus_note: null,
      focus_override: false,
    })
    .select('id, slug, title, summary, published, published_at, is_featured, featured_rank, focus_note, focus_override')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Nao foi possivel criar o universo');
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    published: Boolean(data.published),
    publishedAt: data.published_at ?? null,
    isFeatured: Boolean(data.is_featured),
    featuredRank: Number(data.featured_rank ?? 0),
    focusNote: data.focus_note ?? null,
    focusOverride: Boolean(data.focus_override),
  } satisfies UniverseMeta;
}

async function seedMockCollectives(universe: UniverseMeta, template: UniverseBootstrapTemplate, userId?: string | null) {
  if (!userId) return 0;
  let count = 0;
  for (const templateId of template.seedCollectiveTemplates) {
    const notebookTemplate = getNotebookTemplate(templateId);
    if (!notebookTemplate) continue;
    const notebook = applyNotebookTemplate(notebookTemplate, {
      title: notebookTemplate.title,
      summary: notebookTemplate.summary,
      visibility: notebookTemplate.visibility,
    });
    createMockSharedNotebook({
      universeId: universe.id,
      universeSlug: universe.slug,
      userId,
      title: notebook.title,
      summary: notebook.summary ?? undefined,
      visibility: notebook.visibility,
      templateId: notebook.templateId,
      templateMeta: notebook.templateMeta,
    });
    count += 1;
  }
  return count;
}

async function seedMockTemplate(universe: UniverseMeta, template: UniverseBootstrapTemplate, userId?: string | null): Promise<SeedCounts> {
  const collectiveTemplateCount = await seedMockCollectives(universe, template, userId);
  upsertBootstrappedMockUniverse({
    id: universe.id,
    slug: universe.slug,
    title: universe.title,
    summary: universe.summary,
    published: universe.published,
    publishedAt: universe.publishedAt,
    isFeatured: template.opsDefaults.isFeatured,
    featuredRank: template.opsDefaults.featuredRank,
    focusNote: template.opsDefaults.focusNote,
    focusOverride: template.opsDefaults.focusOverride,
    templateId: template.id,
    sourceUniverseId: null,
    coreNodes: template.seedNodes.map((node) => ({
      id: `${universe.slug}-${node.slug}`,
      slug: node.slug,
      title: node.title,
      kind: node.kind,
      summary: node.summary,
      tags: [...node.tags],
    })),
    glossaryCount: template.seedGlossary.length,
    trailCount: Math.max(template.seedTrails.length, 1),
    questionCount: template.seedQuestions.length,
    collectiveTemplateCount,
  });
  return {
    nodes: template.seedNodes.length,
    glossary: template.seedGlossary.length,
    questions: template.seedQuestions.length,
    trails: Math.max(template.seedTrails.length, 1),
    collectiveTemplates: collectiveTemplateCount,
  };
}

async function seedDbTemplate(universe: UniverseMeta, template: UniverseBootstrapTemplate, userId?: string | null): Promise<SeedCounts> {
  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('Admin DB unavailable');

  const nodeIds = new Map<string, string>();
  for (const node of template.seedNodes) {
    const { data } = await db
      .from('nodes')
      .upsert({
        universe_id: universe.id,
        slug: node.slug,
        title: node.title,
        kind: node.kind,
        summary: node.summary,
        tags: node.tags,
      }, { onConflict: 'universe_id,slug' })
      .select('id, slug')
      .single();
    if (data) nodeIds.set(data.slug, data.id);
  }

  for (const item of template.seedGlossary) {
    await db.from('glossary_terms').upsert({
      universe_id: universe.id,
      term: item.term,
      slug: slugify(item.term),
      short_def: item.shortDef,
      body: item.body,
      tags: item.tags,
      node_id: item.nodeSlug ? nodeIds.get(item.nodeSlug) ?? null : null,
      question_prompts: item.questionPrompts?.length ? item.questionPrompts : null,
      created_by: userId ?? null,
    }, { onConflict: 'universe_id,slug' });
  }

  for (const item of template.seedQuestions) {
    const nodeId = nodeIds.get(item.nodeSlug);
    if (!nodeId) continue;
    await db.from('node_questions').upsert({
      universe_id: universe.id,
      node_id: nodeId,
      question: item.question,
      pin_rank: item.pinRank ?? 100,
      created_by: userId ?? null,
    }, { onConflict: 'node_id,question' });
  }

  let trailCount = 0;
  for (const trail of template.seedTrails) {
    const { data: trailRow } = await db
      .from('trails')
      .upsert({
        universe_id: universe.id,
        slug: trail.slug,
        title: trail.title,
        summary: trail.summary,
        is_system: Boolean(trail.isSystem),
      }, { onConflict: 'universe_id,slug' })
      .select('id')
      .single();
    if (!trailRow?.id) continue;
    trailCount += 1;
    await db.from('trail_steps').delete().eq('trail_id', trailRow.id);
    if (trail.steps.length > 0) {
      await db.from('trail_steps').insert(
        trail.steps.map((step, index) => ({
          trail_id: trailRow.id,
          step_order: index + 1,
          title: step.title,
          instruction: step.instruction,
          node_id: step.nodeSlug ? nodeIds.get(step.nodeSlug) ?? null : null,
          guided_question: step.guidedQuestion ?? null,
          guided_node_id: step.nodeSlug ? nodeIds.get(step.nodeSlug) ?? null : null,
          requires_question: Boolean(step.requiresQuestion),
        })),
      );
    }
  }

  await ensureQuickStartTrail(universe.id, universe.slug);
  trailCount = Math.max(trailCount, 1);

  let collectiveTemplateCount = 0;
  const session = await getCurrentSession();
  for (const templateId of template.seedCollectiveTemplates) {
    const notebookTemplate = getNotebookTemplate(templateId);
    if (!notebookTemplate) continue;
    const notebook = applyNotebookTemplate(notebookTemplate, {
      title: notebookTemplate.title,
      summary: notebookTemplate.summary,
      visibility: notebookTemplate.visibility,
    });
    const { data: shared } = await db
      .from('shared_notebooks')
      .upsert({
        universe_id: universe.id,
        title: notebook.title,
        slug: notebook.slug,
        summary: notebook.summary,
        visibility: notebook.visibility,
        created_by: userId ?? session?.userId ?? null,
        meta: {
          templateId,
          suggestedTags: notebook.templateMeta.suggestedTags,
          preferredSources: notebook.templateMeta.preferredSources,
          microcopy: notebook.templateMeta.microcopy,
        },
      }, { onConflict: 'universe_id,slug' })
      .select('id')
      .maybeSingle();
    if (shared?.id && (userId ?? session?.userId)) {
      await db.from('shared_notebook_members').upsert({
        notebook_id: shared.id,
        user_id: userId ?? session?.userId,
        role: 'owner',
      }, { onConflict: 'notebook_id,user_id' });
    }
    collectiveTemplateCount += 1;
  }

  await db.from('universes').update({
    is_featured: template.opsDefaults.isFeatured,
    featured_rank: template.opsDefaults.featuredRank,
    focus_note: template.opsDefaults.focusNote,
    focus_override: template.opsDefaults.focusOverride,
  }).eq('id', universe.id);

  return {
    nodes: template.seedNodes.length,
    glossary: template.seedGlossary.length,
    questions: template.seedQuestions.length,
    trails: trailCount,
    collectiveTemplates: collectiveTemplateCount,
  };
}

export async function bootstrapUniverseFromTemplate(input: BootstrapTemplateInput) {
  const universe = await getUniverseMeta(input.universeId);
  const template = getUniverseBootstrapTemplate(input.templateId);
  if (!universe || !template) throw new Error('Template ou universo destino nao encontrado');
  const counts = shouldUseMockBootstrap()
    ? await seedMockTemplate(universe, template, input.userId)
    : await seedDbTemplate(universe, template, input.userId);
  return { universeId: universe.id, universeSlug: universe.slug, templateId: template.id, counts };
}

async function cloneMockStructure(input: CloneUniverseInput) {
  const sourceBootstrapped = getBootstrappedMockUniverseById(input.sourceUniverseId) ?? listBootstrappedMockUniverses().find((item) => item.id === input.sourceUniverseId) ?? null;
  const sourceMock = sourceBootstrapped
    ? sourceBootstrapped
    : (() => {
        const sourceSlug = input.sourceUniverseId.replace(/^mock-/, '') || 'exemplo';
        const base = getUniverseMock(sourceSlug);
        return {
          id: input.sourceUniverseId,
          slug: sourceSlug,
          title: base.title,
          summary: base.summary,
          published: true,
          publishedAt: new Date().toISOString(),
          isFeatured: false,
          featuredRank: 0,
          focusNote: null,
          focusOverride: false,
          templateId: null,
          sourceUniverseId: null,
          coreNodes: base.coreNodes.map((node) => ({
            id: node.id,
            slug: node.slug ?? node.id,
            title: node.label,
            kind: (node.type === 'evento' ? 'event' : node.type === 'pessoa' ? 'person' : 'concept') as 'event' | 'person' | 'concept',
            summary: node.summary ?? 'Estrutura clonada do universo de origem.',
            tags: [...(node.tags ?? [])],
          })),
          glossaryCount: 2,
          trailCount: 1,
          questionCount: 2,
          collectiveTemplateCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })();
  const target = await getUniverseMeta(input.targetUniverseId);
  if (!target) throw new Error('Origem ou destino do clone nao encontrado');

  upsertBootstrappedMockUniverse({
    id: target.id,
    slug: target.slug,
    title: target.title,
    summary: target.summary,
    sourceUniverseId: sourceMock.id,
    coreNodes: input.options.nodes
      ? sourceMock.coreNodes.map((node) => ({ ...node, id: `${target.slug}-${node.slug}`, tags: [...node.tags] }))
      : [],
    glossaryCount: input.options.glossary ? sourceMock.glossaryCount : 0,
    trailCount: input.options.trails ? Math.max(sourceMock.trailCount, 1) : 1,
    questionCount: input.options.nodeQuestions ? sourceMock.questionCount : 0,
    collectiveTemplateCount: input.options.collectiveTemplates ? sourceMock.collectiveTemplateCount : 0,
    isFeatured: input.options.homeEditorialDefaults ? sourceMock.isFeatured : false,
    featuredRank: input.options.homeEditorialDefaults ? sourceMock.featuredRank : 0,
    focusNote: input.options.homeEditorialDefaults ? sourceMock.focusNote : null,
    focusOverride: input.options.homeEditorialDefaults ? sourceMock.focusOverride : false,
    templateId: sourceMock.templateId,
  });

  return {
    counts: {
      nodes: input.options.nodes ? sourceMock.coreNodes.length : 0,
      glossary: input.options.glossary ? sourceMock.glossaryCount : 0,
      questions: input.options.nodeQuestions ? sourceMock.questionCount : 0,
      trails: input.options.trails ? Math.max(sourceMock.trailCount, 1) : 0,
      collectiveTemplates: input.options.collectiveTemplates ? sourceMock.collectiveTemplateCount : 0,
    },
    blocked: {
      evidences: true,
      documents: true,
      events: true,
      exports: true,
      analytics: true,
      userNotes: true,
      sharedNotebooks: true,
      studySessions: true,
    },
  };
}

async function cloneDbStructure(input: CloneUniverseInput) {
  const db = getSupabaseServiceRoleClient();
  if (!db) throw new Error('Admin DB unavailable');
  const [source, target] = await Promise.all([getUniverseMeta(input.sourceUniverseId), getUniverseMeta(input.targetUniverseId)]);
  if (!source || !target) throw new Error('Origem ou destino do clone nao encontrado');

  const nodeMap = new Map<string, string>();
  let nodeCount = 0;
  if (input.options.nodes) {
    const { data: sourceNodes } = await db.from('nodes').select('id, slug, title, kind, summary, tags').eq('universe_id', source.id);
    for (const node of sourceNodes ?? []) {
      const { data: inserted } = await db.from('nodes').upsert({
        universe_id: target.id,
        slug: node.slug,
        title: node.title,
        kind: node.kind,
        summary: node.summary,
        tags: node.tags ?? [],
      }, { onConflict: 'universe_id,slug' }).select('id').single();
      if (inserted?.id) {
        nodeMap.set(node.id, inserted.id);
        nodeCount += 1;
      }
    }
  }

  let glossaryCount = 0;
  if (input.options.glossary) {
    const { data: rows } = await db.from('glossary_terms').select('term, slug, short_def, body, tags, node_id, question_prompts').eq('universe_id', source.id);
    for (const row of rows ?? []) {
      await db.from('glossary_terms').upsert({
        universe_id: target.id,
        term: row.term,
        slug: row.slug,
        short_def: row.short_def,
        body: row.body,
        tags: row.tags ?? [],
        node_id: row.node_id ? nodeMap.get(row.node_id) ?? null : null,
        question_prompts: row.question_prompts ?? null,
      }, { onConflict: 'universe_id,slug' });
      glossaryCount += 1;
    }
  }

  let questionCount = 0;
  if (input.options.nodeQuestions) {
    const { data: rows } = await db.from('node_questions').select('node_id, question, pin_rank').eq('universe_id', source.id);
    for (const row of rows ?? []) {
      const targetNodeId = nodeMap.get(row.node_id);
      if (!targetNodeId) continue;
      await db.from('node_questions').upsert({ universe_id: target.id, node_id: targetNodeId, question: row.question, pin_rank: row.pin_rank }, { onConflict: 'node_id,question' });
      questionCount += 1;
    }
  }

  let trailCount = 0;
  if (input.options.trails) {
    const { data: trails } = await db.from('trails').select('id, slug, title, summary, is_system').eq('universe_id', source.id);
    for (const trail of trails ?? []) {
      const { data: insertedTrail } = await db.from('trails').upsert({
        universe_id: target.id,
        slug: trail.slug,
        title: trail.title,
        summary: trail.summary,
        is_system: Boolean(trail.is_system),
      }, { onConflict: 'universe_id,slug' }).select('id').single();
      if (!insertedTrail?.id) continue;
      trailCount += 1;
      const { data: steps } = await db.from('trail_steps').select('step_order, title, instruction, node_id, guided_question, guided_node_id, requires_question').eq('trail_id', trail.id).order('step_order', { ascending: true });
      await db.from('trail_steps').delete().eq('trail_id', insertedTrail.id);
      if ((steps ?? []).length > 0) {
        await db.from('trail_steps').insert((steps ?? []).map((step) => ({
          trail_id: insertedTrail.id,
          step_order: step.step_order,
          title: step.title,
          instruction: step.instruction,
          node_id: step.node_id ? nodeMap.get(step.node_id) ?? null : null,
          guided_question: step.guided_question ?? null,
          guided_node_id: step.guided_node_id ? nodeMap.get(step.guided_node_id) ?? null : null,
          requires_question: Boolean(step.requires_question),
        })));
      }
    }
  }

  if (!input.options.trails) {
    await ensureQuickStartTrail(target.id, target.slug);
    trailCount = 1;
  }

  let collectiveTemplateCount = 0;
  if (input.options.collectiveTemplates) {
    const session = await getCurrentSession();
    const { data: notebooks } = await db.from('shared_notebooks').select('title, slug, summary, visibility, meta').eq('universe_id', source.id);
    for (const notebook of notebooks ?? []) {
      await db.from('shared_notebooks').upsert({
        universe_id: target.id,
        title: notebook.title,
        slug: notebook.slug,
        summary: notebook.summary,
        visibility: notebook.visibility,
        created_by: input.userId ?? session?.userId ?? null,
        meta: notebook.meta ?? {},
      }, { onConflict: 'universe_id,slug' });
      collectiveTemplateCount += 1;
    }
  }

  if (input.options.homeEditorialDefaults) {
    await db.from('universes').update({
      is_featured: source.isFeatured,
      featured_rank: source.featuredRank,
      focus_note: source.focusNote,
      focus_override: source.focusOverride,
    }).eq('id', target.id);
  }

  return {
    counts: {
      nodes: nodeCount,
      glossary: glossaryCount,
      questions: questionCount,
      trails: trailCount,
      collectiveTemplates: collectiveTemplateCount,
    },
    blocked: {
      evidences: true,
      documents: true,
      events: true,
      exports: true,
      analytics: true,
      userNotes: true,
      sharedNotebooks: true,
      studySessions: true,
    },
  };
}

export async function cloneUniverseStructure(input: CloneUniverseInput) {
  const options = normalizeCloneOptions(input.options);
  if (shouldUseMockBootstrap()) return cloneMockStructure({ ...input, options });
  return cloneDbStructure({ ...input, options });
}

export async function bootstrapUniverseWorkflow(input: {
  mode: 'template' | 'clone';
  universe: CreateUniverseInput;
  templateId?: UniverseBootstrapTemplateId | null;
  sourceUniverseId?: string | null;
  cloneOptions?: Partial<CloneUniverseStructureOptions> | null;
  userId?: string | null;
}) {
  const created = await createUniverse(input.universe);
  if (input.mode === 'template') {
    const template = getUniverseBootstrapTemplate(input.templateId ?? 'blank_minimal');
    const resolved = applyUniverseBootstrapTemplate(template, {
      title: input.universe.title,
      slug: input.universe.slug,
      summary: input.universe.summary,
    });
    if (!template) throw new Error('Template nao encontrado');
    await bootstrapUniverseFromTemplate({
      universeId: created.id,
      universeSlug: resolved.slug,
      templateId: template.id,
      userId: input.userId,
    });
    return created;
  }

  if (!input.sourceUniverseId) throw new Error('Clone exige universo de origem');
  await cloneUniverseStructure({
    sourceUniverseId: input.sourceUniverseId,
    targetUniverseId: created.id,
    userId: input.userId,
    options: normalizeCloneOptions(input.cloneOptions),
  });
  return created;
}

export function buildInitialHubPreview(templateId: UniverseBootstrapTemplateId) {
  const template = getUniverseBootstrapTemplate(templateId);
  if (!template) return null;
  return {
    title: template.titleHint,
    summary: template.summaryHint,
    nodes: template.seedNodes.slice(0, 4).map((node) => node.title),
    portals: ['Mapa', 'Provas', 'Trilhas'],
    quickStart: 'Comece Aqui',
  };
}




