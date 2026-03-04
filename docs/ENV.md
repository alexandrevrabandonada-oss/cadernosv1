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
- `NEXT_PUBLIC_SITE_URL`
  - tipo: publica
  - uso: base URL para redirects/login em ambiente web
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
- `UPSTASH_REDIS_REST_URL`
  - tipo: secreta server-side
  - uso: endpoint REST do Redis para rate limit distribuido
- `UPSTASH_REDIS_REST_TOKEN`
  - tipo: secreta server-side
  - uso: token REST do Redis para rate limit distribuido
- `RATE_LIMIT_ENABLED`
  - tipo: flag server-side
  - uso: habilita/desabilita enforcement de rate limit (`1`/`0`)
- `SENTRY_DSN`
  - tipo: secreta server-side (pode existir variante publica conforme projeto)
  - uso: envio de erros/trace para Sentry
- `SENTRY_AUTH_TOKEN`
  - tipo: secreta CI
  - uso: upload de sourcemaps/release em pipeline
- `SENTRY_ENVIRONMENT`
  - tipo: server-side
  - uso: separa eventos por ambiente (`development|preview|production`)
- `SENTRY_TRACES_SAMPLE_RATE`
  - tipo: server-side
  - uso: amostragem de traces (ex.: `0.1`)
- `SENTRY_PROFILES_SAMPLE_RATE`
  - tipo: server-side
  - uso: profiling (geralmente `0.0` no inicio)
- `DEV_ADMIN_BYPASS`
  - tipo: feature flag local (apenas desenvolvimento)
  - uso: permite bypass de auth para admin quando `NODE_ENV=development` e valor `1`

Observacao Sentry:
- para desabilitar completamente, deixe `SENTRY_DSN` vazio.

## Onde configurar

### Local (`.env.local`)

- Defina:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL` (ex.: `http://localhost:3000`)
  - `SUPABASE_SERVICE_ROLE_KEY` (se precisar de operacoes admin)
  - `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` (opcional local)
  - `RATE_LIMIT_ENABLED=0` para desabilitar localmente
  - `SENTRY_DSN` (opcional; se vazio, Sentry fica no-op)
  - `SENTRY_ENVIRONMENT=development`
  - `SENTRY_TRACES_SAMPLE_RATE=0.1`
  - `SENTRY_PROFILES_SAMPLE_RATE=0.0`
  - variaveis de CLI (`SUPABASE_*`, `VERCEL_*`) apenas se usar automacao local
  - `DEV_ADMIN_BYPASS=1` somente para desenvolvimento local sem login
- `.env.local` nao deve ser commitado.

### GitHub Actions (Secrets/Variables)

- Secrets recomendados:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_PASSWORD`
  - `SUPABASE_ACCESS_TOKEN`
  - `VERCEL_TOKEN`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
- Variables (ou secrets):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL`
  - `SUPABASE_PROJECT_REF`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

### Vercel (Project Settings > Environment Variables)

- Production/Preview/Development:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL`
- Apenas server runtime:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `RATE_LIMIT_ENABLED`
  - `SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN` (somente se usar release upload no runtime/ci)
  - `SENTRY_ENVIRONMENT`
  - `SENTRY_TRACES_SAMPLE_RATE`
  - `SENTRY_PROFILES_SAMPLE_RATE`
  - `DEV_ADMIN_BYPASS` (deixe `0` em preview/prod)
- Nao envie `SUPABASE_DB_PASSWORD` para runtime web, salvo necessidade explicita.

## Helpers no codigo

- Browser: `lib/supabase/client.ts`
- Server-only: `lib/supabase/server.ts`
- Auth guards: `lib/auth/server.ts` e `lib/auth/requireRole.ts`
- Observabilidade Sentry: `sentry.*.config.ts` e `lib/obs/sentry.ts`

## Aviso amigavel no app

- O layout renderiza um aviso visual quando faltam:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Isso nao quebra build nem runtime.

## Guardrail de secrets

- Rodar localmente antes de commit:
  - `npm run secrets:check`
- O CI executa o mesmo check e falha se detectar segredo/padrao sensivel.
