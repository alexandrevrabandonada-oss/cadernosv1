# Security Guide

## Auth no admin

- Login em `/login` com Supabase Auth (email/senha).
- Sessao SSR-friendly via cookies (`@supabase/ssr` + `middleware.ts`).
- Rotas `/admin/*` protegidas no servidor por role.

## Modelo de papeis

- Tabela: `public.profiles`
  - `id` (uuid, referencia `auth.users.id`)
  - `email` (texto)
  - `role` (`admin | editor | viewer`)
- Regras:
  - `admin`: leitura/escrita no admin e operacoes de gestao.
  - `editor`: leitura/escrita operacional (sem gestao de roles).
  - `viewer`: somente leitura.

## RLS (resumo)

- Leitura publica permanece limitada a universos com `published_at is not null`.
- Escrita em tabelas de conteudo: apenas `authenticated` com `public.is_editor_or_admin()`.
- `qa_threads/citations`: insercao apenas via `service_role` (API server-side), nao direto do client.
- `qa_logs/ingest_logs`: leitura apenas `editor/admin`; insercao apenas via `service_role`.
- Funcoes:
  - `public.current_profile_role()`
  - `public.is_editor_or_admin()`
  - `public.is_admin()`

## Publicacao de universos (catalogo publico)

- Home (`/`) lista somente universos publicados.
- Rotas publicas de universo (`/c/[slug]` e subrotas) so ficam visiveis quando publicado.
- Quando nao publicado:
  - publico recebe resposta sanitizada (404).
  - `editor/admin` autenticado pode acessar em modo preview.
- Publish/unpublish e controlado no admin com `published_at`:
  - publicar: `published_at = now()`
  - despublicar: `published_at = null`

## Protecao server-side

- Server actions de escrita exigem `requireEditorOrAdmin()`.
- Guards centrais:
  - `requireUser()`
  - `requireEditorOrAdmin()`
  - `requireAdmin()`
- Nao confiar no client para autorizacao.

## Rate limit (producao)

- Implementado com Upstash Redis (distribuido) e fallback in-memory para dev sem Redis.
- Limites padrao:
  - `/api/ask` anon: `20/60s`
  - `/api/ask` autenticado: `60/60s`
  - ingest admin (processar doc/tudo): `5/60s`
  - escritas admin criticas: `30/60s`
- Chaves usam hash de identidade (userId/ip), sem salvar IP bruto em logs.
- Para desabilitar localmente: `RATE_LIMIT_ENABLED=0`.

## Observabilidade (Sentry + logs)

- Sentry e opcional: sem `SENTRY_DSN`, o app segue funcionando (no-op).
- Coleta habilitada:
  - excecoes server/client/edge
  - contexto tecnico seguro (rota, ids tecnicos, latencia)
  - email de usuario somente quando ja exibido em area admin autenticada
- Coleta desabilitada/sanitizada:
  - sem request body
  - sem `Authorization` e sem `Cookie` em headers enviados
  - sem IP bruto nos logs de aplicacao
- Nao usar Sentry para dados sensiveis de negocio.
- Para reduzir custo/volume:
  - ajustar `SENTRY_TRACES_SAMPLE_RATE`
  - manter `SENTRY_PROFILES_SAMPLE_RATE=0.0` ate necessidade real.

## Dev bypass

- `DEV_ADMIN_BYPASS=1` funciona somente quando `NODE_ENV=development`.
- Nunca habilitar em preview/producao.

## Setup inicial de roles

1. Criar usuario no Supabase Auth.
2. Promover papel em `profiles` (SQL Editor), exemplo:

```sql
insert into public.profiles (id, email, role)
values ('<AUTH_USER_ID>', '<EMAIL_DO_USUARIO>', 'admin')
on conflict (id) do update
set role = excluded.role,
    email = excluded.email;
```

3. Para promover para editor, troque `'admin'` por `'editor'`.
4. Fazer login em `/login` e acessar `/admin`.

## Como armazenamos secrets

- Local: apenas em `.env.local` (nunca versionado).
- GitHub Actions: em `Repository Secrets`.
- Vercel: em `Project Environment Variables`.
- Supabase: chaves e tokens mantidos no painel/CLI oficial.
- Nunca armazenar segredos em:
  - commits
  - issue tracker
  - `reports/*.md`
  - logs de CI/CD

## Rotacao de secrets (checklist)

Quando houver suspeita de vazamento, rotacionar imediatamente:

1. Supabase:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ACCESS_TOKEN`
   - (se aplicavel) anon/public key e JWT secret
2. Upstash:
   - `UPSTASH_REDIS_REST_TOKEN`
3. Vercel:
   - `VERCEL_TOKEN`
4. Sentry:
   - `SENTRY_AUTH_TOKEN`
5. Atualizar segredos em:
   - GitHub Secrets
   - Vercel env vars
   - ambientes locais de quem precisa
6. Reexecutar `npm run secrets:check` e pipeline CI/CD.

## Resposta a incidente (se vazou)

1. Revogar/rotacionar credenciais imediatamente.
2. Remover o segredo do histórico recente (rebase/force push apenas se aceitável no projeto; preferir revogação rápida primeiro).
3. Invalidar sessões/tokens ativos quando aplicável.
4. Revisar logs de acesso (Supabase, Vercel, Sentry, Upstash).
5. Registrar incidente e ações de contenção no `reports/` sem incluir valores secretos.

## Regra operacional

- Nunca colar secrets em relatórios, comentários de PR, output de script ou logs de erro.

## Analytics e privacidade

- Tracking interno via `POST /api/track` (sem GA por padrão).
- Coletamos apenas:
  - `session_id` anônimo (`cv_sid`)
  - `user_id` quando autenticado
  - rota/evento/objeto e metadados curtos de CTA
- Não coletamos:
  - IP bruto
  - texto de perguntas do debate
  - payloads sensíveis de auth
