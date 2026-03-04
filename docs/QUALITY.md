# Quality (RAG)

## Objetivo

Melhorar qualidade do `/api/ask` sem alucinacao:
- diversidade de fontes
- re-rank transparente
- resposta padronizada
- modo estrito preservado

## Pipeline

1. `retrieveCandidates(universeId, question, { k: 20 })`
   - busca semantica (ou textual fallback)
   - retorna chunk + doc + score + metadados de documento
2. `rerankCandidates(..., { k: 8, maxPerDoc: 3, minDistinctDocs: 2, focusTop: 6 })`
   - limita repeticao por documento
   - tenta garantir >=2 docs distintos no topo quando houver disponibilidade
   - desempate com recencia (ano) quando score for muito proximo
3. `composeAnswer(...)`
   - formato fixo:
     - `## Achados`
     - `## Limitacoes`
     - `## Citacoes`

## Regras de diversidade

- maximo de 3 chunks por documento (`maxPerDoc=3`).
- objetivo de 2 documentos distintos nos primeiros 6 selecionados.
- se so existir 1 documento na base consultavel, sistema degrada sem quebrar.

## Modo estrito

`insufficient` quando:
- menos de 3 chunks selecionados, ou
- menos de 2 docs distintos, quando existem >=2 docs disponiveis.

Nesse caso:
- sem conclusao forte
- resposta padronizada com limitacoes
- `suggestions` para refinamento.

## Telemetria

`qa_logs` registra:
- `docs_distintos`
- `chunks_usados`
- `insufficient_reason`
- `status_code`, `latency_ms`, `rate_limited`

`/admin/status` mostra média `docs_distintos` das asks (24h).
