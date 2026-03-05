import 'server-only';
import { getQuickQuestions } from '@/lib/onboarding/questions';
import { getUniverseChecklist } from '@/lib/ops/universeChecklist';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

type HighlightRow = {
  universe_id: string;
  evidence_ids: string[] | null;
  question_prompts: string[] | null;
  event_ids: string[] | null;
  updated_at: string;
};

export type UniverseHighlightData = {
  universeId: string;
  evidenceIds: string[];
  questionPrompts: string[];
  eventIds: string[];
  updatedAt: string | null;
};

type PublishShowcaseResult = {
  ok: boolean;
  blocked: boolean;
  forced: boolean;
  failChecks: Array<{ id: string; label: string; value: string; target: string }>;
  highlightsAutoPicked: boolean;
  publishedAt: string | null;
  universeSlug: string | null;
  message: string;
};

function uniqueIds(values: (string | null | undefined)[], max: number) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = String(value ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function uniqueText(values: (string | null | undefined)[], max: number) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

export async function getUniverseHighlights(universeId: string): Promise<UniverseHighlightData | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data } = await db
    .from('universe_highlights')
    .select('universe_id, evidence_ids, question_prompts, event_ids, updated_at')
    .eq('universe_id', universeId)
    .maybeSingle();
  if (!data) return null;
  const row = data as HighlightRow;
  return {
    universeId: row.universe_id,
    evidenceIds: uniqueIds(row.evidence_ids ?? [], 6),
    questionPrompts: uniqueText(row.question_prompts ?? [], 6),
    eventIds: uniqueIds(row.event_ids ?? [], 3),
    updatedAt: row.updated_at ?? null,
  };
}

export async function upsertUniverseHighlights(input: {
  universeId: string;
  evidenceIds?: string[];
  questionPrompts?: string[];
  eventIds?: string[];
  updatedBy?: string | null;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const payload = {
    universe_id: input.universeId,
    evidence_ids: uniqueIds(input.evidenceIds ?? [], 6),
    question_prompts: uniqueText(input.questionPrompts ?? [], 6),
    event_ids: uniqueIds(input.eventIds ?? [], 3),
    updated_by: input.updatedBy ?? null,
  };
  const { data } = await db.from('universe_highlights').upsert(payload, { onConflict: 'universe_id' }).select('*').maybeSingle();
  return (data as HighlightRow | null) ?? null;
}

export async function autoPickHighlights(universeId: string, updatedBy?: string | null) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;

  const { data: nodesRaw } = await db
    .from('nodes')
    .select('id, kind, tags')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: true });
  const coreNodeIds = (nodesRaw ?? [])
    .filter((node) => {
      const tags = (node.tags ?? []).map((tag: string) => tag.toLowerCase());
      return node.kind === 'core' || node.kind === 'concept' || tags.includes('core');
    })
    .map((node) => node.id);

  const { data: nodeEvidenceRaw } = await db
    .from('node_evidences')
    .select('node_id, evidence_id, pin_rank')
    .eq('universe_id', universeId)
    .order('pin_rank', { ascending: true })
    .limit(240);

  const nodeEvidenceIds = Array.from(new Set((nodeEvidenceRaw ?? []).map((row) => row.evidence_id)));
  const { data: evidenceStatusRaw } =
    nodeEvidenceIds.length > 0
      ? await db.from('evidences').select('id, status').in('id', nodeEvidenceIds)
      : { data: [] as Array<{ id: string; status: string }> };
  const evidenceStatusById = new Map((evidenceStatusRaw ?? []).map((row) => [row.id, row.status]));

  const evidenceByNode = new Map<string, Array<{ evidenceId: string; pinRank: number }>>();
  for (const row of nodeEvidenceRaw ?? []) {
    if (evidenceStatusById.get(row.evidence_id) !== 'published') continue;
    const list = evidenceByNode.get(row.node_id) ?? [];
    list.push({ evidenceId: row.evidence_id, pinRank: row.pin_rank ?? 100 });
    evidenceByNode.set(row.node_id, list);
  }

  const evidenceIds: string[] = [];
  const usedEvidence = new Set<string>();
  for (const nodeId of coreNodeIds) {
    const first = (evidenceByNode.get(nodeId) ?? [])[0];
    if (!first || usedEvidence.has(first.evidenceId)) continue;
    evidenceIds.push(first.evidenceId);
    usedEvidence.add(first.evidenceId);
    if (evidenceIds.length >= 6) break;
  }
  if (evidenceIds.length < 6) {
    for (const row of nodeEvidenceRaw ?? []) {
      if (usedEvidence.has(row.evidence_id)) continue;
      evidenceIds.push(row.evidence_id);
      usedEvidence.add(row.evidence_id);
      if (evidenceIds.length >= 6) break;
    }
  }

  const { data: nodeQuestionsRaw } = await db
    .from('node_questions')
    .select('node_id, question, pin_rank')
    .eq('universe_id', universeId)
    .order('pin_rank', { ascending: true })
    .limit(200);

  const questionPrompts = uniqueText(
    (nodeQuestionsRaw ?? [])
      .filter((item) => coreNodeIds.length === 0 || coreNodeIds.includes(item.node_id))
      .map((item) => item.question),
    3,
  );
  if (questionPrompts.length < 3) {
    const fallback = await getQuickQuestions(universeId);
    questionPrompts.push(...uniqueText(fallback.map((item) => item.question), 3));
  }

  const { data: eventsRaw } = await db
    .from('events')
    .select('id, day, kind')
    .eq('universe_id', universeId)
    .order('day', { ascending: false })
    .limit(120);
  const eventIds: string[] = [];
  const usedKinds = new Set<string>();
  for (const event of eventsRaw ?? []) {
    const kind = String(event.kind ?? 'event').toLowerCase();
    if (usedKinds.has(kind)) continue;
    eventIds.push(event.id);
    usedKinds.add(kind);
    if (eventIds.length >= 3) break;
  }
  if (eventIds.length < 3) {
    for (const event of eventsRaw ?? []) {
      if (eventIds.includes(event.id)) continue;
      eventIds.push(event.id);
      if (eventIds.length >= 3) break;
    }
  }

  return upsertUniverseHighlights({
    universeId,
    evidenceIds,
    questionPrompts,
    eventIds,
    updatedBy: updatedBy ?? null,
  });
}

export async function publishShowcaseUniverse(input: {
  universeId: string;
  force?: boolean;
  updatedBy?: string | null;
}): Promise<PublishShowcaseResult> {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    return {
      ok: false,
      blocked: true,
      forced: false,
      failChecks: [],
      highlightsAutoPicked: false,
      publishedAt: null,
      universeSlug: null,
      message: 'Supabase indisponivel.',
    };
  }

  const checklist = await getUniverseChecklist(input.universeId);
  if (!checklist) {
    return {
      ok: false,
      blocked: true,
      forced: false,
      failChecks: [],
      highlightsAutoPicked: false,
      publishedAt: null,
      universeSlug: null,
      message: 'Checklist indisponivel para este universo.',
    };
  }

  const criticalFails = checklist.checks
    .filter((check) => check.status === 'fail')
    .filter((check) => check.id !== 'published_safety');

  if (criticalFails.length > 0 && !input.force) {
    return {
      ok: false,
      blocked: true,
      forced: false,
      failChecks: criticalFails.map((item) => ({
        id: item.id,
        label: item.label,
        value: item.value,
        target: item.target,
      })),
      highlightsAutoPicked: false,
      publishedAt: null,
      universeSlug: checklist.overview.slug,
      message: 'Publicacao bloqueada por FAIL critico no checklist.',
    };
  }

  let highlights = await getUniverseHighlights(input.universeId);
  let highlightsAutoPicked = false;
  const hasKit = Boolean(
    highlights && highlights.evidenceIds.length > 0 && highlights.questionPrompts.length > 0 && highlights.eventIds.length > 0,
  );
  if (!hasKit) {
    await autoPickHighlights(input.universeId, input.updatedBy ?? null);
    highlights = await getUniverseHighlights(input.universeId);
    highlightsAutoPicked = true;
  }

  const publishIso = new Date().toISOString();
  await db
    .from('universes')
    .update({ published_at: publishIso, published: true })
    .eq('id', input.universeId);

  await db.from('ingest_logs').insert({
    universe_id: input.universeId,
    level: criticalFails.length > 0 && input.force ? 'error' : 'info',
    message: 'showcase_published',
    details: {
      forced: Boolean(input.force),
      criticalFailCount: criticalFails.length,
      highlightsAutoPicked,
      evidenceHighlights: highlights?.evidenceIds.length ?? 0,
      questionHighlights: highlights?.questionPrompts.length ?? 0,
      eventHighlights: highlights?.eventIds.length ?? 0,
    },
  });

  return {
    ok: true,
    blocked: false,
    forced: Boolean(input.force),
    failChecks: criticalFails.map((item) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      target: item.target,
    })),
    highlightsAutoPicked,
    publishedAt: publishIso,
    universeSlug: checklist.overview.slug,
    message:
      criticalFails.length > 0 && input.force
        ? 'Publicado com override admin (FAIL critico registrado em log).'
        : 'Publicado como vitrine com sucesso.',
  };
}
