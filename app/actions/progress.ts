'use server';

import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';
import { listDoneStepsForTrail } from '@/lib/progress/server';

type ProgressInput = {
  universeId: string;
  trailId: string;
  stepId: string;
};

export async function markStepDone(input: ProgressInput) {
  const session = await getCurrentSession();
  if (!session || session.userId === 'dev-bypass') return { ok: false as const, reason: 'unauthenticated' as const };
  const db = await getSupabaseServerAuthClient();
  if (!db) return { ok: false as const, reason: 'db_unavailable' as const };

  const payload = {
    user_id: session.userId,
    universe_id: input.universeId,
    trail_id: input.trailId,
    step_id: input.stepId,
    status: 'done',
  };
  const { error } = await db.from('user_trail_progress').upsert(payload, {
    onConflict: 'user_id,step_id',
  });
  if (error) return { ok: false as const, reason: 'insert_failed' as const };
  return { ok: true as const };
}

export async function listDoneSteps(input: { trailId: string }) {
  return listDoneStepsForTrail(input.trailId);
}
