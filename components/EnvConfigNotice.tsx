const requiredPublic = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

function getMissingPublicEnv() {
  return requiredPublic.filter((key) => !process.env[key]);
}

export function EnvConfigNotice() {
  const missing = getMissingPublicEnv();
  if (missing.length === 0) {
    return null;
  }

  return (
    <div className='env-warning' role='status' aria-live='polite'>
      <strong>Supabase ainda nao configurado.</strong>
      <span>
        Defina em <code>.env.local</code>: {missing.join(', ')}
      </span>
    </div>
  );
}
