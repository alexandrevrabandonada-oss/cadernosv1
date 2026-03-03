# Schema + Seed Report 0006

Data: 2026-03-03
Escopo: primeira migration SQL do core MVP, seed inicial e leitura Hub/Mapa via banco com fallback.

## Migration MVP

- Arquivo criado:
  - `supabase/migrations/20260303235500_core_mvp.sql`

- Tabelas criadas:
  - `universes`
  - `nodes`
  - `edges`
  - `documents`
  - `chunks`
  - `evidences`
  - `trails`
  - `trail_steps`
  - `qa_threads`
  - `citations`
  - `tutor_modules`
  - `tutor_steps`

- Recursos adicionais:
  - extensoes `pgcrypto` e `vector`
  - indices por `universe_id`
  - constraints de consistencia (status, kind, ranges, etc.)

## RLS base

- RLS habilitado em todas as tabelas do core.
- Leitura publica (anon/authenticated) condicionada a universo publicado.
- Escrita bloqueada por default e permitida apenas para role futura `admin`.
- Funcao auxiliar `public.is_admin()` usada nas politicas de escrita.

## Seed inicial (SQL)

- Incluido na mesma migration:
  - 1 universo publicado (`universo-mvp`)
  - 12 nos
  - 15 arestas

## App: Hub/Mapa lendo do banco com fallback

- Nova camada de dados:
  - `lib/data/universe.ts`
  - `getHubData(slug)` e `getMapData(slug)`
- Comportamento:
  - se Supabase estiver configurado e consultas funcionarem -> fonte `db`
  - se env/tabelas/consulta falharem -> fallback para mock
- Arquivos atualizados:
  - `app/c/[slug]/page.tsx` (Hub)
  - `app/c/[slug]/mapa/page.tsx` (Mapa)
  - `lib/mock/universe.ts` (tipos exportados)

## Documentacao

- `docs/DB.md` atualizado com:
  - referencia da migration MVP
  - fluxo de seed/migrations
  - modo dev simples sem travar desenvolvimento

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
