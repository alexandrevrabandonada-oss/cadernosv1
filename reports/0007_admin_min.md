# Admin Minimal Report 0007

Data: 2026-03-03
Escopo: `/admin` minimo com seguranca por env e CRUD basico.

## Gate de acesso

- Implementado `ADMIN_MODE` server-side:
  - `app/admin/layout.tsx`
  - comportamento: se `ADMIN_MODE != "1"` retorna 404 (`notFound()`).

## Rotas criadas

- `/admin`
  - pagina indice do painel
  - link para modulo de universos
- `/admin/universes`
  - listar universos
  - criar universo (Server Action)
- `/admin/universes/[id]`
  - editar metadados (`title`, `slug`, `summary`, `cover_url`, `ui_theme`, `published`)
  - Server Action de update
- `/admin/universes/[id]/nodes`
  - CRUD simples de nos:
    - criar no
    - editar no
    - excluir no
  - tudo via Server Actions

## Seguranca e segredo

- Nenhum segredo exposto no client.
- Escrita administrativa usa somente server-side:
  - `lib/admin/db.ts` + `getSupabaseServiceRoleClient()`
- Se `SUPABASE_SERVICE_ROLE_KEY` ausente:
  - UI mostra estado de configuracao e botoes de escrita ficam desabilitados.

## Arquivos principais

- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/universes/page.tsx`
- `app/admin/universes/[id]/page.tsx`
- `app/admin/universes/[id]/nodes/page.tsx`
- `lib/admin/db.ts`
- `docs/ENV.md` (inclui `ADMIN_MODE`)

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
