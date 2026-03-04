# Universo Demo — Poluicao em Volta Redonda (`poluicao-vr`)

## Objetivo
Este universo e a vitrine operacional do Cadernos Vivos: ingestao, curadoria, debate, tutor, checklist e publicacao.

## O que o seed cria
- Universo: `poluicao-vr` (publicado por padrao)
- Nos:
  - 9 nos core
  - 16 nos secundarios
- Grafo:
  - 20+ edges iniciais
- Glossario:
  - 15+ termos
- Linha do tempo:
  - 20+ eventos
- Trilhas:
  - `comece-aqui` (auto pelo app)
  - 2 trilhas extras seedadas
- Perguntas por no:
  - 3 por no core
- Fontes:
  - le `data/demo/poluicao-vr.sources.json`
  - DOI/URL entram como `documents` `link_only`
  - PDF local (quando existir) tenta upload em `cv-docs` e marca `uploaded`

## Arquivos
- Seed principal: `tools/seed-demo.mjs`
- Import em lote: `tools/import-sources.mjs`
- Lista de fontes: `data/demo/poluicao-vr.sources.json`
- PDFs locais opcionais: `data/demo/pdfs/`
- Relatorio de import: `reports/demo_poluicao_vr_import.md`

## Console da Demo (admin)
- Rota dedicada: `/admin/universes/[id]/demo`
- Recursos:
  - validacao do `sources.json` (placeholders, duplicados, PDFs ausentes, tags sem match)
  - `Importar fontes agora`
  - `Enfileirar ingest do lote`
  - `Rodar worker agora (N jobs)`
  - painel de progresso (`link_only/uploaded/processed` + jobs `pending/running/error`)
  - atalhos para `/assistido`, `/checklist` e `/docs/qualidade`

## Fluxo recomendado
1. Rodar seed base:
```bash
npm run demo:seed
```

2. Preencher `data/demo/poluicao-vr.sources.json` com DOI/URL/PDF reais.
   Observacao: os placeholders atuais estao marcados como `PLACEHOLDER` e devem ser substituidos.

3. Rodar import em lote:
```bash
npm run demo:import
```

4. No admin, operar pelo Console da Demo:
- `/admin/universes` -> abrir universo `poluicao-vr`
- `/admin/universes/[id]/demo`
- validar `sources.json`, importar, enfileirar ingest e rodar worker ate ter 10+ PDFs processados

5. Curadoria assistida:
- `/admin/universes/[id]/assistido`
- vincular docs aos nos
- promover evidencias candidatas
- completar perguntas por no

6. Checklist:
- `/admin/universes/[id]/checklist`
- fechar lacunas de cobertura/qualidade

7. Publicacao:
- `/admin/universes/[id]`
- validar `published_at` ativo
- confirmar exibicao no catalogo (`/`)

## Notas de qualidade
- Sem navegação web automatica neste seed: fontes reais devem ser preenchidas manualmente.
- Evidencias seedadas sao placeholders de curadoria para bootstrap e devem ser substituidas por evidencias curadas reais apos ingestao.
