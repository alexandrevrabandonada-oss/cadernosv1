# Deploy & CI/CD

## Visao geral

Este projeto usa dois workflows:

- `CI` (`.github/workflows/ci.yml`)
  - dispara em `pull_request` e `push`
  - executa: `npm ci` + `npm run verify`
- `CD` (`.github/workflows/cd.yml`)
  - dispara em `push` na `main`
  - executa: `npm ci` + `npm run verify` + deploy de migrations + deploy Vercel

## Setup 1x (GitHub)

Configure os seguintes **Repository Secrets**:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Sem esses valores o workflow de CD falha no passo de validacao inicial com mensagens claras.

## Setup 1x (Vercel / Supabase)

1. Garanta que o projeto Vercel esteja vinculado ao repositório.
2. Garanta que as env vars da aplicacao estejam configuradas no Vercel.
   - inclua `NEXT_PUBLIC_SITE_URL` com a URL publica da aplicacao.
3. Garanta que o projeto Supabase existe e aceita o token informado.
4. Confirme que as migrations em `supabase/migrations/` estao em ordem.
5. Configure Supabase Auth (Email/Password) e crie pelo menos um usuario admin em `public.profiles`.

## Rotina diaria

1. Abra PR:
   - CI valida build/lint/types automaticamente.
2. Faça merge na `main`:
   - CD roda validacao completa.
   - CD aplica migrations (`npm run db:deploy`).
   - CD publica no Vercel (`vercel deploy --prod`).

## Setup de Auth e papeis (1x)

1. No Supabase Dashboard, habilite provider de Email/Password.
2. Crie usuario(s) para o painel admin.
3. Atribua papel em `public.profiles`:
   - `admin`: gestao total.
   - `editor`: escrita operacional.
   - `viewer`: somente leitura.
4. Nunca habilite `DEV_ADMIN_BYPASS` em preview/producao.

## Falhas e diagnostico

- Falha em `npm run verify`:
  - revisar logs de lint/typecheck/build.
- Falha em `Link Supabase project`:
  - validar `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.
- Falha em `Deploy database migrations`:
  - revisar SQL em `supabase/migrations`.
- Falha em `Deploy to Vercel`:
  - validar `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Seguranca de logs

- Workflows nao fazem `echo` de secrets.
- Secrets sao passados via `env` do job e mascarados pelo GitHub Actions.
- Evite adicionar comandos que imprimam variaveis sensiveis (por exemplo `printenv`, `env`, `set`).
