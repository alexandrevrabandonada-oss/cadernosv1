import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type ServerClientOptions = {
  useServiceRole?: boolean;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

export function isSupabaseServerEnvConfigured() {
  return Boolean(getBaseUrl() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServerClient(
  options: ServerClientOptions = {},
): SupabaseClient | null {
  const url = getBaseUrl();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    return null;
  }

  const key = options.useServiceRole ? serviceRole : anon;
  if (!key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseServiceRoleClient() {
  return getSupabaseServerClient({ useServiceRole: true });
}
