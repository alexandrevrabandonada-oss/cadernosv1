# Estado da Nacao — Cadernos Vivos
Data: 2026-03-11
Prompt: PROD-17
Commit (se possivel): n/a

## 1) O que entrou neste tijolo
- O programa editorial multiuniverso agora nasce com um lote real e idempotente de 3 universos operacionais.
- Foi criado o programa principal `Programa Editorial 2026` com slug `programa-editorial-2026`.
- Os tres universos entram automaticamente no board principal com lane inicial `bootstrap`, unpublished e prioridade definida.
- O seed do lote reutiliza o bootstrap de PROD-15 e o board de PROD-16, sem criar workflow paralelo.
- Foi gerado um plano operacional por universo em `reports/PLANO_INSUMOS_MULTIUNIVERSO.md`.

## 2) Programa editorial usado
- Titulo: `Programa Editorial 2026`
- Slug: `programa-editorial-2026`
- Summary: lote inicial de tres universos reais operados em paralelo com bootstrap, ingest, quality e publish.

## 3) Os 3 universos criados
### 1. Saude e Poluicao em Volta Redonda
- Slug: `saude-poluicao-vr`
- Template: `issue_investigation`
- Prioridade: alta (`3`)
- Lane inicial: `bootstrap`
- Status publico: unpublished

### 2. Memoria Industrial de Volta Redonda
- Slug: `memoria-industrial-vr`
- Template: `territorial_memory`
- Prioridade: media (`2`)
- Lane inicial: `bootstrap`
- Status publico: unpublished

### 3. Respira Fundo Monitoramento
- Slug: `respira-fundo-monitoramento`
- Template: `campaign_watch`
- Prioridade: alta (`3`)
- Lane inicial: `bootstrap`
- Status publico: unpublished

## 4) Bootstrap completo garantido
Para cada um dos 3 universos, o seed garante:
- hero/hub funcionando
- nodes core do template
- glossario base
- perguntas iniciais
- trilha `Comece Aqui`
- checklist inicial
- `is_featured = false`
- `focus_override = false`
- `published_at = null`

## 5) Arquivos principais
- `lib/editorial/programBatch.ts`
- `app/admin/programa-editorial/page.tsx`
- `app/admin/programa-editorial/[slug]/page.tsx`
- `app/api/admin/programa-editorial/route.ts`
- `reports/PLANO_INSUMOS_MULTIUNIVERSO.md`
- `docs/PROGRAMA_EDITORIAL.md`
- `docs/BOOTSTRAP_UNIVERSE.md`
- `tests/editorial-program-batch.test.ts`
- `tests/e2e/ui-smoke.spec.ts`

## 6) Plano de insumos
### Arquivo novo
- `reports/PLANO_INSUMOS_MULTIUNIVERSO.md`

### O que o plano documenta
Para cada universo:
- objetivo editorial
- template usado
- fontes prioritarias
- proxima lane
- prioridade
- metas minimas de docs, evidences e highlights
- observacoes operacionais

## 7) Admin / board
### Comportamento novo
- `/admin/programa-editorial` agora garante o lote 2026 de forma idempotente.
- `/admin/programa-editorial/programa-editorial-2026` mostra os 3 universos claramente no board.
- Os cards mostram:
  - template label
  - summary curta
  - badge de prioridade
  - lane atual e lane sugerida
  - CTA para hub, bootstrap, review, checklist, highlights e featured/focus

### API admin
- `POST /api/admin/programa-editorial` ganhou `action='ensure_main_batch'`
- isso garante o programa principal + lote real no ambiente de teste/admin

## 8) Como testar
1. Abrir `/admin/programa-editorial`.
2. Abrir `/admin/programa-editorial/programa-editorial-2026`.
3. Validar que os 3 universos aparecem em `bootstrap`.
4. Abrir o hub de `saude-poluicao-vr` e conferir hero + portas + `Comece Aqui`.
5. Abrir o checklist de um dos universos e confirmar que o bootstrap inicial existe.
6. Conferir `reports/PLANO_INSUMOS_MULTIUNIVERSO.md` para o plano de fontes e proximas lanes.

## 9) Testes e cobertura
### Unit
- `tests/editorial-program-batch.test.ts`
  - valida os tres universos do lote
  - valida slugs unicos
  - valida templates corretos
  - valida lane atual `bootstrap`

### E2E
- `tests/e2e/ui-smoke.spec.ts`
  - garante o lote principal via API admin
  - abre o board do programa principal
  - verifica os 3 universos no board
  - abre um hub novo
  - valida hub + gating unpublished via admin session

## 10) Verificacoes finais
- `npm run verify`: ✅ Verify passou
- `npm run test:e2e:ci`: ✅ E2E passou
- `npm run test:ui:ci`: ✅ Visual passou

## 11) Observacoes
- O `test:e2e:ci` continuou fechando verde com 2 flakies antigos do workspace:
  - `coletivos: detalhe restrito mostra estado de acesso`
  - `admin bootstrap: cria universo por template, abre hub e checklist inicial`
- O fluxo novo do lote real 2026 passou.
- Permanecem apenas os avisos operacionais conhecidos:
  - deprecacao futura do `next lint` para Next 16
  - warnings nao bloqueantes do webpack cache
