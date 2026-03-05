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
  "confidence": {
    "score": 78,
    "label": "forte"
  },
  "limitations": [
    "Base concentrada em um unico documento."
  ],
  "divergence": {
    "flag": false,
    "summary": null
  },
  "docsDistinct": 3,
  "avgDocQuality": 74,
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
- `confidence`:
  - `score`: heuristica 0..100 sobre sustentacao da resposta.
  - `label`: `forte|media|fraca`.
- `limitations`: bullets deterministicas para leitura critica.
- `divergence`: sinaliza possivel conflito/inconclusao entre fontes.
- `docsDistinct` e `avgDocQuality`: metadados de apoio para rastreabilidade.
- `suggestions` traz termos/nos sugeridos quando `insufficient=true`.
- Em modo estrito, sem evidencias suficientes nao ha conclusao.

## POST `/api/track`

Tracking leve de produto (server-side) para funil/CTAs/share.

### Input

```json
{
  "universeSlug": "poluicao-vr",
  "event_name": "cta_click",
  "route": "/c/poluicao-vr/mapa",
  "object_type": "node",
  "object_id": "uuid-opcional",
  "meta": { "cta": "ver_provas" }
}
```

### Notas

- `event_name` aceitos:
  - `page_view`
  - `cta_click`
  - `share_view`
  - `share_open_app`
  - `evidence_click`
  - `node_select`
  - `download_click`
- Sessão anônima via cookie `cv_sid`.
- Endpoint aplica validação e rate-limit por sessão.
