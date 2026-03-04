# API Guide

## POST `/api/ask`

Pergunta ao motor de debate por universo.

### Input

```json
{
  "universeSlug": "universo-mvp",
  "question": "Quais evidencias apoiam a hipotese central?",
  "nodeSlug": "conceito-central",
  "source": "default",
  "scope": {
    "mode": "tutor",
    "requiredEvidenceIds": ["uuid-evidence-1"],
    "documentIds": ["uuid-doc-1", "uuid-doc-2"]
  }
}
```

### Output (200)

```json
{
  "answer": "texto da resposta",
  "mode": "strict_ok",
  "insufficient": false,
  "insufficientReason": null,
  "suggestions": [],
  "threadId": "uuid-da-thread",
  "citations": [
    {
      "ord": 1,
      "citationId": "uuid-da-citation",
      "threadId": "uuid-da-thread",
      "docId": "uuid-do-documento",
      "chunkId": "uuid-do-chunk",
      "doc": "Titulo do documento",
      "year": 2024,
      "pages": "p.10-11",
      "pageStart": 10,
      "pageEnd": 11,
      "quote": "trecho citado",
      "quoteStart": 120,
      "quoteEnd": 188,
      "highlightToken": "token-curto"
    }
  ]
}
```

### Output (429)

```json
{
  "error": "rate_limited",
  "retryAfterSec": 12,
  "message": "Muitas requisicoes. Tente novamente em 12s."
}
```

### Notas

- `quoteStart/quoteEnd` podem ser `null` quando nao for possivel localizar offsets com seguranca.
- `highlightToken` e usado para identificacao de highlight no viewer.
- `nodeSlug` (opcional) ativa boost por documentos vinculados ao no (`node_documents`).
- `source` (opcional):
  - `default` (padrao)
  - `guided` (pergunta guiada de tutoria)
  - `tutor_chat` (chat dentro do ponto de tutor)
- `scope` (opcional):
  - `requiredEvidenceIds`: prioriza evidencias obrigatorias do ponto.
  - `documentIds`: boost para docs do escopo do ponto/no.
  - `mode='tutor'`: registra uso de escopo em logs.
- `mode`:
  - `strict_ok`: resposta com base suficiente.
  - `insufficient`: modo estrito bloqueou conclusao.
- `suggestions` traz termos/nos sugeridos quando `insufficient=true`.
- Em modo estrito, sem evidencias suficientes nao ha conclusao.
