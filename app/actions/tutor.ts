'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/lib/auth/server';
import { planTutorPoints } from '@/lib/tutor/planner';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type TutorPointView = {
  id: string;
  orderIndex: number;
  nodeId: string | null;
  nodeSlug: string | null;
  title: string;
  goal: string;
  requiredEvidenceIds: string[];
  guidedQuestions: string[];
  status: 'todo' | 'done';
  completedAt: string | null;
  lastThreadId: string | null;
};

export type TutorSessionView = {
  id: string;
  universeId: string;
  status: 'active' | 'done';
  currentIndex: number;
  doneAt: string | null;
  points: TutorPointView[];
};

async function getUniverseBySlug(slug: string) {
  const service = getSupabaseServiceRoleClient();
  if (!service) return null;
  const { data } = await service.from('universes').select('id, slug').eq('slug', slug).maybeSingle();
  return data ?? null;
}

async function requireTutorAuth() {
  const session = await getCurrentSession();
  if (!session || session.userId === 'dev-bypass') return null;
  const authDb = await getSupabaseServerAuthClient();
  if (!authDb) return null;
  return { session, authDb };
}

async function mapPoints(
  authDb: NonNullable<Awaited<ReturnType<typeof getSupabaseServerAuthClient>>>,
  sessionId: string,
) {
  const { data: pointsRaw } = await authDb
    .from('tutor_points')
    .select(
      'id, order_index, node_id, title, goal, required_evidence_ids, guided_questions, status, completed_at, last_thread_id',
    )
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true });

  const nodeIds = Array.from(new Set((pointsRaw ?? []).map((item) => item.node_id).filter(Boolean)));
  const { data: nodesRaw } =
    nodeIds.length > 0
      ? await authDb.from('nodes').select('id, slug').in('id', nodeIds)
      : { data: [] as Array<{ id: string; slug: string }> };
  const nodeSlugById = new Map((nodesRaw ?? []).map((item) => [item.id, item.slug]));

  return (pointsRaw ?? []).map((item) => ({
    id: item.id,
    orderIndex: item.order_index,
    nodeId: item.node_id,
    nodeSlug: item.node_id ? nodeSlugById.get(item.node_id) ?? null : null,
    title: item.title,
    goal: item.goal,
    requiredEvidenceIds: (item.required_evidence_ids ?? []) as string[],
    guidedQuestions: (item.guided_questions ?? []) as string[],
    status: (item.status ?? 'todo') as 'todo' | 'done',
    completedAt: item.completed_at ?? null,
    lastThreadId: item.last_thread_id ?? null,
  })) satisfies TutorPointView[];
}

export async function getTutorSession(universeSlug: string): Promise<TutorSessionView | null> {
  const auth = await requireTutorAuth();
  if (!auth) return null;
  const { session, authDb } = auth;
  const universe = await getUniverseBySlug(universeSlug);
  if (!universe) return null;

  const { data: tutorSession } = await authDb
    .from('tutor_sessions')
    .select('id, universe_id, status, current_index, done_at')
    .eq('user_id', session.userId)
    .eq('universe_id', universe.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!tutorSession) return null;

  const points = await mapPoints(authDb, tutorSession.id);

  return {
    id: tutorSession.id,
    universeId: tutorSession.universe_id,
    status: tutorSession.status as 'active' | 'done',
    currentIndex: tutorSession.current_index,
    doneAt: tutorSession.done_at ?? null,
    points,
  };
}

export async function getTutorSessionById(sessionId: string): Promise<TutorSessionView | null> {
  const auth = await requireTutorAuth();
  if (!auth) return null;
  const { session, authDb } = auth;
  const { data: tutorSession } = await authDb
    .from('tutor_sessions')
    .select('id, universe_id, status, current_index, done_at')
    .eq('id', sessionId)
    .eq('user_id', session.userId)
    .maybeSingle();
  if (!tutorSession) return null;
  const points = await mapPoints(authDb, tutorSession.id);
  return {
    id: tutorSession.id,
    universeId: tutorSession.universe_id,
    status: tutorSession.status as 'active' | 'done',
    currentIndex: tutorSession.current_index,
    doneAt: tutorSession.done_at ?? null,
    points,
  };
}

export async function createTutorSession(universeSlug: string) {
  const auth = await requireTutorAuth();
  if (!auth) {
    return { ok: false as const, reason: 'unauthenticated' as const };
  }
  const { session, authDb } = auth;

  const service = getSupabaseServiceRoleClient();
  if (!service) return { ok: false as const, reason: 'db_unavailable' as const };

  const universe = await getUniverseBySlug(universeSlug);
  if (!universe) return { ok: false as const, reason: 'universe_not_found' as const };

  const existing = await getTutorSession(universeSlug);
  if (existing) return { ok: true as const, sessionId: existing.id, reused: true as const };

  const drafts = await planTutorPoints(universe.id);
  if (drafts.length === 0) return { ok: false as const, reason: 'planner_empty' as const };

  const { data: created, error } = await authDb
    .from('tutor_sessions')
    .insert({
      universe_id: universe.id,
      user_id: session.userId,
      status: 'active',
      current_index: 0,
    })
    .select('id')
    .maybeSingle();
  if (error || !created?.id) return { ok: false as const, reason: 'create_failed' as const };

  const payload = drafts.map((draft, index) => ({
    session_id: created.id,
    universe_id: universe.id,
    node_id: draft.nodeId,
    title: draft.title,
    goal: draft.goal,
    required_evidence_ids: draft.requiredEvidenceIds,
    guided_questions: draft.guidedQuestions,
    order_index: index,
    status: 'todo',
  }));

  const { error: pointError } = await authDb.from('tutor_points').insert(payload);
  if (pointError) {
    await service.from('tutor_sessions').delete().eq('id', created.id);
    return { ok: false as const, reason: 'points_failed' as const };
  }

  revalidatePath(`/c/${universeSlug}/tutor`);
  revalidatePath(`/c/${universeSlug}/tutoria`);
  return { ok: true as const, sessionId: created.id, reused: false as const };
}

export async function setTutorCurrentIndex(sessionId: string, index: number) {
  const auth = await requireTutorAuth();
  if (!auth) return { ok: false as const, reason: 'unauthenticated' as const };
  const safeIndex = Math.max(0, index);
  const { authDb, session } = auth;
  const { data: row } = await authDb
    .from('tutor_sessions')
    .update({ current_index: safeIndex })
    .eq('id', sessionId)
    .eq('user_id', session.userId)
    .select('id')
    .maybeSingle();
  if (!row) return { ok: false as const, reason: 'update_failed' as const };
  return { ok: true as const };
}

export async function markTutorPointDone(
  sessionId: string,
  orderIndex: number,
  options: { threadId?: string | null } = {},
) {
  const auth = await requireTutorAuth();
  if (!auth) return { ok: false as const, reason: 'unauthenticated' as const };
  const { authDb, session } = auth;

  const { data: sessionRow } = await authDb
    .from('tutor_sessions')
    .select('id, universe_id, current_index')
    .eq('id', sessionId)
    .eq('user_id', session.userId)
    .maybeSingle();
  if (!sessionRow) return { ok: false as const, reason: 'session_not_found' as const };

  const { data: pointRow } = await authDb
    .from('tutor_points')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      last_thread_id: options.threadId ?? null,
    })
    .eq('session_id', sessionId)
    .eq('order_index', orderIndex)
    .select('id')
    .maybeSingle();
  if (!pointRow) return { ok: false as const, reason: 'point_not_found' as const };

  const { data: allPoints } = await authDb
    .from('tutor_points')
    .select('order_index, status')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true });
  const total = allPoints?.length ?? 0;
  const doneCount = (allPoints ?? []).filter((item) => item.status === 'done').length;
  const done = total > 0 && doneCount >= total;

  const nextIndex = Math.min(orderIndex + 1, Math.max(0, total - 1));
  await authDb
    .from('tutor_sessions')
    .update({
      current_index: done ? Math.max(0, total - 1) : nextIndex,
      status: done ? 'done' : 'active',
      done_at: done ? new Date().toISOString() : null,
    })
    .eq('id', sessionId)
    .eq('user_id', session.userId);

  return { ok: true as const, done, nextIndex };
}

export async function getTutorPlanPreview(universeSlug: string) {
  const universe = await getUniverseBySlug(universeSlug);
  if (!universe) return [] as TutorPointView[];
  const drafts = await planTutorPoints(universe.id);
  return drafts.map((draft, index) => ({
    id: `preview-${index + 1}`,
    orderIndex: draft.orderIndex,
    nodeId: draft.nodeId,
    nodeSlug: draft.nodeSlug,
    title: draft.title,
    goal: draft.goal,
    requiredEvidenceIds: draft.requiredEvidenceIds,
    guidedQuestions: draft.guidedQuestions,
    status: 'todo' as const,
    completedAt: null,
    lastThreadId: null,
  }));
}
