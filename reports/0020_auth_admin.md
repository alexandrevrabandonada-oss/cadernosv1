# Auth Admin Report 0020

Data: 2026-03-03  
Escopo: substituir gate por `ADMIN_MODE` por autenticacao real com Supabase Auth + roles.

## Entregas

- Login e sessao SSR-friendly com Supabase Auth:
  - nova rota `/login` com `signInWithPassword`.
  - cliente auth server-side com cookies (`@supabase/ssr`).
  - middleware para refresh/sincronizacao de sessao.

- Modelo de papeis:
  - migration `profiles` com coluna `role` (`admin|editor|viewer`).
  - funcoes SQL:
    - `public.current_profile_role()`
    - `public.can_write()`
    - `public.is_admin()` (redefinida para perfil real)

- RLS atualizada:
  - leitura publica continua limitada a universos publicados.
  - escrita permitida para `authenticated` com `public.can_write()` (`admin|editor`) nas tabelas de conteudo e logs.

- Protecao server-side:
  - `/admin/*` protegido por `requireAdminPanelAccess()` no layout.
  - server actions de escrita protegidas por `requireAdminWriteAccess()`:
    - universes create/update
    - nodes create/update/delete
    - docs upload/remove/process/process-all
    - salvar evidencia em `/c/[slug]/provas`
  - sem confianca em estado do client para autorizacao.

- Fallback dev:
  - `DEV_ADMIN_BYPASS=1` aceito apenas com `NODE_ENV=development`.

## Arquivos principais

- Auth/session:
  - `app/login/page.tsx`
  - `middleware.ts`
  - `lib/supabase/middleware.ts`
  - `lib/supabase/server.ts`
  - `lib/auth/server.ts`

- Admin e server actions:
  - `app/admin/layout.tsx`
  - `app/admin/page.tsx`
  - `app/admin/universes/page.tsx`
  - `app/admin/universes/[id]/page.tsx`
  - `app/admin/universes/[id]/nodes/page.tsx`
  - `app/admin/universes/[id]/docs/page.tsx`
  - `app/c/[slug]/provas/page.tsx`
  - `lib/admin/db.ts`

- Banco/RLS:
  - `supabase/migrations/20260304030000_auth_profiles_roles.sql`

- Docs/env:
  - `docs/SECURITY.md`
  - `docs/DEPLOY.md`
  - `docs/ENV.md`
  - `.env.example`

## Verificacao

Comando executado:

```bash
npm run verify
```

Resultado:

- lint: OK
- typecheck: OK
- build: OK

Observacoes:

- aviso de deprecacao de `next lint` (nao bloqueante).

## Como testar

1. Aplicar migrations (`npm run db:push`).
2. Criar usuario no Supabase Auth.
3. Inserir role em `public.profiles` (ex.: `admin`).
4. Rodar `npm run dev` e acessar `/login`.
5. Validar:
   - sem login: `/admin` redireciona para `/login`.
   - `viewer`: entra no admin em leitura.
   - `editor/admin`: consegue executar acoes de escrita.
6. Em desenvolvimento, testar bypass com `DEV_ADMIN_BYPASS=1` e `NODE_ENV=development`.
