# Ingest Guide

## Fluxo geral

1. Documento entra no sistema por upload manual ou import DOI/URL.
2. Documento fica com status:
   - `uploaded`: PDF salvo no Storage (`cv-docs`) e pronto para fila.
   - `link_only`: apenas metadados/link, sem PDF no bucket.
   - `processed`: chunking concluido.
   - `error`: erro no pipeline.
3. Admin enfileira ingestao (`ingest_jobs`) e roda worker.
4. Worker processa PDF, gera chunks e atualiza status para `processed`.

## Upload manual

1. Abra `/admin/universes/[id]/docs`.
2. Use o card `Upload PDF`.
3. Envie arquivo PDF.
4. Clique `Enfileirar` (por documento) ou `Enfileirar tudo`.
5. Execute `Rodar worker agora`.

## Import por DOI/URL

1. Na tela `/admin/universes/[id]/docs`, use `Adicionar por DOI/URL`.
2. Informe DOI (ex.: `10.1038/...`) ou URL (`https://...`).
3. Clique `Buscar metadados` para preview.
4. Clique `Importar`.

Resultado:
- Se PDF detectado e download/upload funcionar:
  - `documents.status = uploaded`
  - `storage_path` preenchido
  - pode clicar `Enfileirar ingest`.
- Se PDF nao for detectado ou download falhar:
  - `documents.status = link_only`
  - metadados salvos
  - usar upload manual depois para anexar PDF.

## Guardrails de import

- Apenas `http/https`.
- Bloqueio de hosts locais/privados obvios (`localhost`, redes privadas, link-local).
- Timeout curto em requests externas.
- Limite de tamanho do arquivo PDF: 50MB.
- Sem log de headers/tokens/URL sensivel completa.

## Fila e worker

- `ingest_jobs` controla status (`pending`, `running`, `done`, `error`).
- Worker processa em lotes limitados para nao estourar runtime serverless.
- Logs resumidos em `ingest_logs`.

## Dicas operacionais

- Em `link_only`, complete com upload manual antes de enfileirar.
- Se rate limit retornar 429, aguarde o `retryAfterSec`.
- Evite enfileirar em massa repetidamente; use `Rodar worker agora` em rodadas.

## Publicacao e exports

- Depois do processamento, use:
  - Debate: `Gerar Dossie (MD+PDF)`
  - Trilhas: `Gerar Caderno de Estudo (MD+PDF)`
- Os arquivos vao para `cv-exports` e ganham metadados em `public.exports`.
- Para liberar acesso publico:
  - no admin do universo, marque `is_public` no export.
  - o universo precisa estar publicado.
- Download e feito por signed URL no app.
