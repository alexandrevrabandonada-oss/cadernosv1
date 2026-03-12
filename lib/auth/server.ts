import 'server-only';
import { cookies } from 'next/headers';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type AppRole = 'admin' | 'editor' | 'viewer';

const ADMIN_BYPASS_COOKIE = 'cv_admin_bypass';

export function isDevAdminBypass() {
  const devBypass = process.env.NODE_ENV === 'development' && process.env.DEV_ADMIN_BYPASS === '1';
  const testBypass = process.env.NODE_ENV !== 'production' && process.env.TEST_SEED === '1';
  return devBypass || testBypass;
}

async function hasEmergencyAdminBypass() {
  const token = process.env.ADMIN_BYPASS_TOKEN?.trim();
  if (!token) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_BYPASS_COOKIE)?.value === token;
}

export async function getCurrentSession() {
  if (isDevAdminBypass()) {
    return { userId: 'dev-bypass', email: 'dev@local', role: 'admin' as AppRole };
  }

  if (await hasEmergencyAdminBypass()) {
    return { userId: 'emergency-admin-bypass', email: 'bypass@local', role: 'admin' as AppRole };
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
