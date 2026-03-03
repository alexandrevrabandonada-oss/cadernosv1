# Upload Storage Report 0008

Data: 2026-03-03
Escopo: upload de PDF no admin para Supabase Storage + registro em `documents`.

## Entregas

- Nova rota admin:
  - `/admin/universes/[id]/docs`
  - arquivo: `app/admin/universes/[id]/docs/page.tsx`

- Funcionalidades:
  - upload de PDF para bucket `cv-docs` (Supabase Storage)
  - cria/atualiza registro em `documents` com `status='uploaded'`
  - listagem de documentos do universo
  - remoção com soft delete (flag `is_deleted=true`)
  - exibicao de status (`uploaded`/`processed`)
  - sem ingestao nesta fase

- Navegacao admin atualizada:
  - links para docs em:
    - `app/admin/universes/page.tsx`
    - `app/admin/universes/[id]/page.tsx`

## Banco (migration incremental)

- Criada migration:
  - `supabase/migrations/20260304001000_documents_soft_delete.sql`
- Alteracoes:
  - `documents.is_deleted boolean not null default false`
  - policy `documents_public_read` ajustada para ignorar itens soft-deleted

## Seguranca

- Upload e escrita ocorrem somente em Server Actions.
- Uso de client server-side (`SUPABASE_SERVICE_ROLE_KEY`) via `getAdminDb()`.
- Nenhum segredo enviado ao client.

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
