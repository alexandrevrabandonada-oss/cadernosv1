# Banco de Dados (Supabase CLI)

## Estrutura

- `supabase/config.toml`: configuracao versionada do projeto Supabase CLI.
- `supabase/migrations/`: migrations SQL versionadas.

## Scripts npm

- `npm run db:login`
  - login na Supabase CLI (usa `SUPABASE_ACCESS_TOKEN` quando presente).
- `npm run db:link`
  - vincula o repo ao projeto remoto usando `SUPABASE_PROJECT_REF`.
  - usa `SUPABASE_DB_PASSWORD` se definido.
- `npm run db:push`
  - aplica migrations no ambiente de desenvolvimento vinculado.
- `npm run db:deploy`
  - aplica migrations para deploy/CI (`db push --linked --include-all`).
- `npm run db:status`
  - lista o estado das migrations.

## Fluxo recomendado

1. Criar migration nova:

```bash
npx supabase migration new nome_da_migration
```

2. Editar o SQL em `supabase/migrations/<timestamp>_nome_da_migration.sql`.

3. Aplicar no ambiente vinculado (dev):

```bash
npm run db:link
npm run db:push
```

4. Conferir status:

```bash
npm run db:status
```

5. Deploy em producao via CI:

```bash
npm run db:deploy
```

## Primeira migration MVP

- Arquivo: `supabase/migrations/20260303235500_core_mvp.sql`
- Entrega:
  - schema base do Cadernos Vivos (universes, nodes, edges, documents, chunks, evidences, trails, trail_steps, qa_threads, citations, tutor_modules, tutor_steps)
  - RLS com leitura publica apenas para universo publicado
  - escrita restrita para role futura `admin`
  - seed inicial com:
    - 1 universo (`universo-mvp`)
    - 12 nos
    - 15 arestas

## Modo dev simples

- Opcao recomendada:
  - use `SUPABASE_SERVICE_ROLE_KEY` no servidor para tarefas administrativas e seed.
  - mantenha leitura publica via anon conforme politicas.
- Se precisar destravar rapidamente em ambiente local isolado:
  - publicar universo de teste (`published = true`) para leitura anon.
  - evite desabilitar RLS em ambientes compartilhados.
- Em CI/producao:
  - aplique apenas `npm run db:deploy` com secrets configurados.

## Seguranca

- Nao commitar credenciais.
- Use `.env.local` para desenvolvimento.
- Use Secrets no GitHub Actions e Vercel para `SUPABASE_*` e `VERCEL_*`.
