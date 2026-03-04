import 'server-only';
import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';
import { DEFAULT_UI_SETTINGS, normalizeUiSettings, type UiSettings } from '@/lib/user/uiSettings';

export async function getUserUiSettings() {
  const session = await getCurrentSession();
  if (!session || session.userId === 'dev-bypass') {
    return { settings: DEFAULT_UI_SETTINGS, isLoggedIn: false };
  }
  const auth = await getSupabaseServerAuthClient();
  if (!auth) {
    return { settings: DEFAULT_UI_SETTINGS, isLoggedIn: false };
  }

  const { data: profile } = await auth
    .from('profiles')
    .select('ui_settings')
    .eq('id', session.userId)
    .maybeSingle();

  return {
    settings: normalizeUiSettings(profile?.ui_settings),
    isLoggedIn: true,
  };
}

export async function updateUserUiSettings(patch: Partial<UiSettings>) {
  const session = await getCurrentSession();
  if (!session || session.userId === 'dev-bypass') return null;
  const auth = await getSupabaseServerAuthClient();
  if (!auth) return null;

  const { data: current } = await auth
    .from('profiles')
    .select('ui_settings')
    .eq('id', session.userId)
    .maybeSingle();

  const merged = normalizeUiSettings({
    ...(current?.ui_settings ?? {}),
    ...patch,
  });

  const { data: updated } = await auth
    .from('profiles')
    .update({ ui_settings: merged })
    .eq('id', session.userId)
    .select('ui_settings')
    .maybeSingle();

  return normalizeUiSettings(updated?.ui_settings ?? merged);
}

export { DEFAULT_UI_SETTINGS };
