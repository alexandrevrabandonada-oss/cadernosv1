import 'server-only';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type AppRole = 'admin' | 'editor' | 'viewer';

export function isDevAdminBypass() {
  return process.env.NODE_ENV === 'development' && process.env.DEV_ADMIN_BYPASS === '1';
}

export async function getCurrentSession() {
  if (isDevAdminBypass()) {
    return { userId: 'dev-bypass', email: 'dev@local', role: 'admin' as AppRole };
  }

  const auth = await getSupabaseServerAuthClient();
  if (!auth) return null;

  const { data } = await auth.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const service = getSupabaseServiceRoleClient();
  if (!service) {
    return { userId: user.id, email: user.email ?? null, role: 'viewer' as AppRole };
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role ?? 'viewer') as AppRole;
  return { userId: user.id, email: user.email ?? null, role };
}
