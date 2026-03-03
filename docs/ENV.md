# ENV Guide

## Objetivo

Separar variaveis publicas (seguras para browser) de segredos server-only.

## Variaveis

- `NEXT_PUBLIC_SUPABASE_URL`
  - tipo: publica
  - uso: client/browser e server
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - tipo: publica
  - uso: client/browser e server
- `SUPABASE_SERVICE_ROLE_KEY`
  - tipo: secreta
  - uso: apenas server-only
- `SUPABASE_PROJECT_REF`
  - tipo: secreta operacional
  - uso: scripts/CLI
- `SUPABASE_DB_PASSWORD`
  - tipo: secreta
  - uso: operacoes administrativas (CLI, migracoes)
- `SUPABASE_ACCESS_TOKEN`
  - tipo: secreta
  - uso: autenticacao da Supabase CLI em CI/local
- `VERCEL_TOKEN`
  - tipo: secreta
  - uso: deploy/inspecao via CLI em CI
- `VERCEL_ORG_ID`
  - tipo: identificador
  - uso: CI/Vercel linkage
- `VERCEL_PROJECT_ID`
  - tipo: identificador
  - uso: CI/Vercel linkage
- `ADMIN_MODE`
  - tipo: feature flag server-side
  - uso: habilita rotas `/admin` quando valor for `1`

## Onde configurar

### Local (`.env.local`)

- Defina:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (se precisar de operacoes admin)
  - variaveis de CLI (`SUPABASE_*`, `VERCEL_*`) apenas se usar automacao local
  - `ADMIN_MODE=1` para habilitar o painel admin localmente
- `.env.local` nao deve ser commitado.

### GitHub Actions (Secrets/Variables)

- Secrets recomendados:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_PASSWORD`
  - `SUPABASE_ACCESS_TOKEN`
  - `VERCEL_TOKEN`
- Variables (ou secrets):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_PROJECT_REF`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

### Vercel (Project Settings > Environment Variables)

- Production/Preview/Development:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Apenas server runtime:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_MODE` (defina `1` apenas onde admin deve ficar acessivel)
- Nao envie `SUPABASE_DB_PASSWORD` para runtime web, salvo necessidade explicita.

## Helpers no codigo

- Browser: `lib/supabase/client.ts`
- Server-only: `lib/supabase/server.ts`

## Aviso amigavel no app

- O layout renderiza um aviso visual quando faltam:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Isso nao quebra build nem runtime.
