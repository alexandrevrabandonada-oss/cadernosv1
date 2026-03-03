# Vector Search Report 0010

Data: 2026-03-03
Escopo: ativacao de busca vetorial com pgvector + fallback textual.

## Entregas SQL

- Migration criada:
  - `supabase/migrations/20260304011500_vector_search.sql`

- Itens incluídos:
  - `create extension if not exists vector`
  - garantia de coluna `chunks.embedding vector(1536)`
  - indice `ivfflat` para embeddings
  - RPC `public.match_chunks(...)` para top-k por `universe_id`
    - ordenacao por distancia cosseno (`<=>`)
    - retorno com `similarity`

## Camada de embeddings

- Arquivo: `lib/search/embeddings.ts`
- Interface pronta para provider:
  - `EMBEDDING_PROVIDER=openai|mock|none`
- Comportamento atual:
  - provider `mock` deterministico por padrao
  - `openai` preparado como placeholder compatível
  - utilitario `toVectorLiteral(...)` para persistencia no Postgres vector

## Ingestao: chunks novos com embedding

- `lib/ingest/process.ts` atualizado:
  - apos inserir chunks novos, gera embeddings
  - atualiza `chunks.embedding`
  - mantem fluxo de status `documents.status='processed'`

## Busca semântica com fallback

- Arquivo: `lib/search/semantic.ts`
- Fluxo:
  1. tenta gerar embedding da query
  2. chama RPC `match_chunks` (vetorial)
  3. se indisponivel/sem resultado, fallback para busca textual (`ilike`) em `chunks.text`

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

- Aviso de deprecacao de `next lint` no Next 15.5.12 (nao bloqueante).
