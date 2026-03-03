# Supabase Integration Report 0004

Data: 2026-03-03
Escopo: integracao Supabase com separacao segura entre client publico e server-only.

## Entregas

- Dependencia instalada:
  - `@supabase/supabase-js`

- Helpers criados:
  - `lib/supabase/client.ts`
    - usa `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - singleton de client para browser (`getSupabaseBrowserClient`)
  - `lib/supabase/server.ts`
    - `server-only`
    - helper seguro para server (`getSupabaseServerClient`)
    - helper opcional para service role (`getSupabaseServiceRoleClient`)
    - sem exposicao da service role em componentes cliente

- Envs:
  - `.env.example` atualizado com:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `SUPABASE_PROJECT_REF`
    - `SUPABASE_DB_PASSWORD`
    - `SUPABASE_ACCESS_TOKEN`
    - `VERCEL_TOKEN`
    - `VERCEL_ORG_ID`
    - `VERCEL_PROJECT_ID`

- Documentacao:
  - `docs/ENV.md`
    - mapeamento local vs GitHub Actions vs Vercel
    - classificacao publica vs secreta

- UX amigavel quando env falta:
  - `components/EnvConfigNotice.tsx`
  - integrado em `app/layout.tsx`
  - aviso visual sem quebrar build/runtime

## Verificacao

Comando executado:

```bash
npm run verify
```

Resultado:

- `lint`: OK
- `typecheck`: OK
- `build`: OK

Observacao:

- Aviso de deprecacao do `next lint` no Next 15.5.12 (nao bloqueante).
