# Timeline Report 0016

Data: 2026-03-03
Escopo: implementacao da timeline em `/c/[slug]/linha` com eventos, filtros e links para evidencias/docs.

## Banco de dados

- Migration criada:
  - `supabase/migrations/20260304020000_events_timeline.sql`
- Tabela adicionada:
  - `events` com campos:
    - `id`
    - `universe_id`
    - `node_id`
    - `evidence_id`
    - `document_id`
    - `title`
    - `summary`
    - `event_date`
    - `period_label`
    - `created_at`
- RLS:
  - leitura publica apenas para universo publicado
  - escrita admin-only
- Seed inicial:
  - 3 eventos para `universo-mvp`

## Página `/c/[slug]/linha`

- Arquivo:
  - `app/c/[slug]/linha/page.tsx`
- Funcionalidades:
  - render timeline baseada em eventos
  - filtros:
    - por periodo (`from`, `to`)
    - por no (`node`)
  - cada evento mostra:
    - titulo, data, periodo, no relacionado
    - resumo
    - links para:
      - evidencias (via `/provas`)
      - documento (`/c/[slug]/doc/[docId]`)
      - debate sugerido

## Camada de dados

- Novo arquivo:
  - `lib/data/timeline.ts`
- Comportamento:
  - leitura do DB quando configurado
  - fallback mock (eventos sinteticos) quando necessario

## Estilo

- `app/globals.css` atualizado com classes da timeline:
  - `timeline-list`
  - `timeline-item`
  - `timeline-dot`
  - `timeline-card`

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
