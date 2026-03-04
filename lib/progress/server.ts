import 'server-only';
import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';

export async function listDoneStepsForTrail(trailId: string) {
  const session = await getCurrentSession();
  if (!session || session.userId === 'dev-bypass') return [] as string[];
  const db = await getSupabaseServerAuthClient();
  if (!db) return [] as string[];

  const { data } = await db
    .from('user_trail_progress')
    .select('step_id')
    .eq('user_id', session.userId)
    .eq('trail_id', trailId);

  return Array.from(new Set((data ?? []).map((item) => item.step_id).filter(Boolean)));
}
