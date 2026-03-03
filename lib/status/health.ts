import 'server-only';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

type HealthState = 'ok' | 'fail' | 'warn';

export type SystemStatus = {
  generatedAt: string;
  env: {
    nextPublicSupabaseUrl: boolean;
    nextPublicSupabaseAnonKey: boolean;
    supabaseServiceRoleKey: boolean;
    supabaseProjectRef: boolean;
    supabaseDbPassword: boolean;
    supabaseAccessToken: boolean;
    vercelToken: boolean;
    vercelOrgId: boolean;
    vercelProjectId: boolean;
    adminModeEnabled: boolean;
  };
  db: {
    state: HealthState;
    message: string;
  };
  storage: {
    state: HealthState;
    message: string;
  };
  counts: {
    universes: number | null;
    documents: number | null;
    chunks: number | null;
  };
};

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

async function countRows(table: 'universes' | 'documents' | 'chunks') {
  const service = getSupabaseServiceRoleClient();
  const fallback = getSupabaseServerClient();
  const client = service ?? fallback;
  if (!client) return null;

  const query = client.from(table).select('*', { count: 'exact', head: true });
  const tableQuery = table === 'documents' ? query.eq('is_deleted', false) : query;
  const { count, error } = await tableQuery;
  if (error) return null;
  return count ?? 0;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const env = {
    nextPublicSupabaseUrl: hasEnv('NEXT_PUBLIC_SUPABASE_URL'),
    nextPublicSupabaseAnonKey: hasEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: hasEnv('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseProjectRef: hasEnv('SUPABASE_PROJECT_REF'),
    supabaseDbPassword: hasEnv('SUPABASE_DB_PASSWORD'),
    supabaseAccessToken: hasEnv('SUPABASE_ACCESS_TOKEN'),
    vercelToken: hasEnv('VERCEL_TOKEN'),
    vercelOrgId: hasEnv('VERCEL_ORG_ID'),
    vercelProjectId: hasEnv('VERCEL_PROJECT_ID'),
    adminModeEnabled: process.env.ADMIN_MODE === '1',
  };

  const service = getSupabaseServiceRoleClient();
  const fallback = getSupabaseServerClient();
  const dbClient = service ?? fallback;

  let dbState: HealthState = 'fail';
  let dbMessage = 'Supabase nao configurado.';
  if (dbClient) {
    const { error } = await dbClient.from('universes').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) {
      dbState = 'fail';
      dbMessage = 'Falha ao consultar banco.';
    } else {
      dbState = 'ok';
      dbMessage = 'Conexao com banco ativa.';
    }
  }

  let storageState: HealthState = 'warn';
  let storageMessage = 'Sem cliente com permissao para validar storage.';
  if (service) {
    const { error } = await service.storage.from('cv-docs').list('', { limit: 1 });
    if (error) {
      storageState = 'fail';
      storageMessage = 'Falha ao acessar bucket cv-docs.';
    } else {
      storageState = 'ok';
      storageMessage = 'Bucket cv-docs acessivel.';
    }
  } else if (fallback) {
    storageState = 'warn';
    storageMessage = 'Cliente anonimo ativo; cheque de storage parcial.';
  }

  const [universes, documents, chunks] = await Promise.all([
    countRows('universes'),
    countRows('documents'),
    countRows('chunks'),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    env,
    db: { state: dbState, message: dbMessage },
    storage: { state: storageState, message: storageMessage },
    counts: { universes, documents, chunks },
  };
}
