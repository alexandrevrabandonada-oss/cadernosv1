# Ingest Chunks Report 0009

Data: 2026-03-03
Escopo: processamento server-side de PDFs com chunking e logs de ingestao.

## Entregas

- Acoes no admin docs:
  - botao `Processar` por documento
  - botao `Processar tudo` por universo
  - arquivo: `app/admin/universes/[id]/docs/page.tsx`

- Pipeline de ingestao server-side:
  - `lib/ingest/config.ts`
    - `chunk_size`
    - `overlap`
  - `lib/ingest/pdf.ts`
    - extracao de texto de PDF por pagina via `pdf-parse` (sem OCR)
  - `lib/ingest/chunk.ts`
    - normalizacao e quebra em chunks com overlap
  - `lib/ingest/process.ts`
    - processamento de 1 documento
    - processamento em lote por universo
    - grava em `chunks` (`page_start`, `page_end`, `text`)
    - atualiza `documents.status='processed'`
    - registra diagnostico em logs

- Dependencias adicionadas:
  - `pdf-parse`
  - `@types/pdf-parse`

## Banco de dados

- Migration criada:
  - `supabase/migrations/20260304004000_ingest_logs.sql`
- Tabela:
  - `ingest_logs` (`universe_id`, `document_id`, `level`, `message`, `details`, `created_at`)
- RLS:
  - leitura publica bloqueada
  - escrita/admin por role `admin` (politicas de admin)

## Fluxo resumido

1. Baixa PDF do bucket `cv-docs` via `storage_path`.
2. Extrai texto por pagina (Node-only, sem OCR).
3. Normaliza texto.
4. Gera chunks por pagina conforme `chunk_size`/`overlap`.
5. Limpa chunks anteriores do documento e reinsere os novos.
6. Marca `documents.status='processed'`.
7. Registra sucesso/erro em `ingest_logs`.

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
