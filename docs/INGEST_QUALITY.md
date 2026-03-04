# Ingest Quality Pass

## O que e
Pos-processamento da ingestao para medir e melhorar qualidade textual antes do retrieval:
- score `0..100` por documento (`text_quality_score`)
- flags de risco (`text_quality_flags`)
- deteccao de paginas vazias
- deteccao/remoção de header/footer repetido

## Como o score e calculado (alto nivel)
Base `100`, com penalidades:
- paginas vazias (peso maior)
- repeticao de linhas entre paginas (header/footer)
- baixa densidade textual

Resultado final e clampado entre `0` e `100`.

## Presets
- `default`: dedupe normal + chunk atual
- `aggressive_dedupe`: remove repeticao com criterio mais forte
- `no_dedupe`: nao remove repeticoes
- `short_chunks`: chunks menores (melhor para PDFs fragmentados)
- `long_chunks`: chunks maiores (melhor para narrativa longa)

## Quando usar cada preset
- Header/footer repetido: `aggressive_dedupe`
- Texto muito quebrado/curto: `short_chunks`
- Texto continuo e limpo: `default`
- Dedupe removendo contexto importante: `no_dedupe`

## Reprocessamento e integridade de citacoes
No reprocess:
1. chunks antigos do documento viram `archived=true`
2. chunks novos entram com `archived=false`
3. retrieval ignora `archived=true`

Assim, citacoes antigas continuam resolvendo para chunks historicos, enquanto busca passa a usar a versao nova.

## Fluxo operacional
1. Abrir `/admin/universes/[id]/docs`.
2. Ver score/flags por documento.
3. Ajustar `ingest_preset`.
4. Clicar em `Reprocessar` (job `reprocess`).
5. Acompanhar em `/admin/universes/[id]/docs/qualidade` e checklist.
