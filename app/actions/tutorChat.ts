'use server';

import { askUniverse } from '@/lib/ask/universe';
import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';

type TutorChatMessage = {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  qaThreadId: string | null;
  createdAt: string;
};

async function requireTutorChatAuth() {
  const session = await getCurrentSession();
  if (!session || session.userId === 'dev-bypass') return null;
  const authDb = await getSupabaseServerAuthClient();
  if (!authDb) return null;
  return { authDb, userId: session.userId };
}

async function getPointScopeForOwner(
  sessionId: string,
  pointId: string,
  userId: string,
  authDb: NonNullable<Awaited<ReturnType<typeof getSupabaseServerAuthClient>>>,
) {
  const { data: point } = await authDb
    .from('tutor_points')
    .select('id, universe_id, node_id, required_evidence_ids, session_id')
    .eq('id', pointId)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (!point) return null;

  const { data: session } = await authDb
    .from('tutor_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!session) return null;

  const requiredEvidenceIds = (point.required_evidence_ids ?? []) as string[];
  const nodeId = point.node_id ?? null;

  const [{ data: node }, { data: nodeDocsRaw }, { data: universe }] = await Promise.all([
    nodeId ? authDb.from('nodes').select('slug').eq('id', nodeId).maybeSingle() : Promise.resolve({ data: null }),
    nodeId
      ? authDb
          .from('node_documents')
          .select('document_id, weight')
          .eq('universe_id', point.universe_id)
          .eq('node_id', nodeId)
          .order('weight', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as Array<{ document_id: string; weight: number | null }> }),
    authDb.from('universes').select('slug').eq('id', point.universe_id).maybeSingle(),
  ]);

  const documentIds = Array.from(
    new Set((nodeDocsRaw ?? []).map((item) => item.document_id).filter((id): id is string => Boolean(id))),
  );
  if (requiredEvidenceIds.length > 0) {
    const { data: evidenceDocs } = await authDb
      .from('evidences')
      .select('document_id')
      .in('id', requiredEvidenceIds);
    for (const row of evidenceDocs ?? []) {
      if (row.document_id && !documentIds.includes(row.document_id)) {
        documentIds.push(row.document_id);
      }
    }
  }

  if (!universe?.slug) return null;
  return {
    universeSlug: universe.slug,
    nodeSlug: node?.slug ?? null,
    requiredEvidenceIds,
    documentIds: documentIds.slice(0, 16),
  };
}

export async function ensureTutorChatThread(sessionId: string, pointId: string) {
  const auth = await requireTutorChatAuth();
  if (!auth) return null;
  const { authDb, userId } = auth;

  const scope = await getPointScopeForOwner(sessionId, pointId, userId, authDb);
  if (!scope) return null;

  const existing = await authDb
    .from('tutor_chat_threads')
    .select('id')
    .eq('point_id', pointId)
    .maybeSingle();
  if (existing.data?.id) return existing.data.id;

  const created = await authDb
    .from('tutor_chat_threads')
    .insert({ session_id: sessionId, point_id: pointId })
    .select('id')
    .maybeSingle();
  return created.data?.id ?? null;
}

export async function listTutorChatMessages(threadId: string): Promise<TutorChatMessage[]> {
  const auth = await requireTutorChatAuth();
  if (!auth) return [];
  const { authDb } = auth;
  const { data } = await authDb
    .from('tutor_chat_messages')
    .select('id, role, text, qa_thread_id, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200);
  return (data ?? []).map((item) => ({
    id: item.id,
    role: item.role as 'user' | 'tutor',
    text: item.text,
    qaThreadId: item.qa_thread_id ?? null,
    createdAt: item.created_at,
  }));
}

export async function sendTutorChatMessage(input: {
  sessionId: string;
  pointId: string;
  text: string;
}) {
  const auth = await requireTutorChatAuth();
  if (!auth) return { ok: false as const, reason: 'unauthenticated' as const };
  const { authDb, userId } = auth;

  const text = input.text.trim();
  if (text.length < 4 || text.length > 500) {
    return { ok: false as const, reason: 'invalid_text' as const };
  }

  const scope = await getPointScopeForOwner(input.sessionId, input.pointId, userId, authDb);
  if (!scope) {
    return { ok: false as const, reason: 'point_not_found' as const };
  }

  const threadId = await ensureTutorChatThread(input.sessionId, input.pointId);
  if (!threadId) {
    return { ok: false as const, reason: 'thread_failed' as const };
  }

  await authDb.from('tutor_chat_messages').insert({
    thread_id: threadId,
    role: 'user',
    text,
    qa_thread_id: null,
  });

  const ask = await askUniverse(
    {
      universeSlug: scope.universeSlug,
      question: text,
      nodeSlug: scope.nodeSlug ?? undefined,
      source: 'tutor_chat',
      scope: {
        mode: 'tutor',
        requiredEvidenceIds: scope.requiredEvidenceIds,
        documentIds: scope.documentIds,
      },
    },
    {
      requesterHashHint: `tutor:${userId.slice(0, 12)}`,
      userId,
      ip: 'server-action',
    },
  );

  if (ask.status !== 200) {
    return { ok: false as const, reason: 'ask_failed' as const, status: ask.status };
  }

  const answer = typeof ask.body.answer === 'string' ? ask.body.answer : '';
  const qaThreadId = typeof ask.body.threadId === 'string' ? ask.body.threadId : null;
  const citations = Array.isArray(ask.body.citations)
    ? (ask.body.citations as Array<{
        citationId: string | null;
        threadId: string | null;
        docId: string;
        doc: string;
        year: number | null;
        pages: string;
        quote: string;
      }>)
    : [];
  const insufficient = Boolean(ask.body.insufficient);
  const insufficientReason = typeof ask.body.insufficientReason === 'string' ? ask.body.insufficientReason : null;
  const suggestions = Array.isArray(ask.body.suggestions)
    ? ask.body.suggestions.filter((item): item is string => typeof item === 'string')
    : [];

  await authDb.from('tutor_chat_messages').insert({
    thread_id: threadId,
    role: 'tutor',
    text: answer,
    qa_thread_id: qaThreadId,
  });

  return {
    ok: true as const,
    threadId,
    answer,
    citations,
    qaThreadId,
    insufficient,
    insufficientReason,
    suggestions,
  };
}
