# Testing UI (Playwright)

## Objetivo

Suite de smoke para proteger as rotas criticas do Workspace:

- `/c/[slug]/provas`
- `/c/[slug]/linha`
- `/c/[slug]/debate`
- `/c/[slug]/glossario`
- `/c/[slug]/mapa`

## Como rodar local

1. Instalar browsers:

```bash
npx playwright install chromium
```

2. Rodar smoke:

```bash
npm run test:e2e
```

3. Rodar modo CI local (headless + seed):

```bash
npm run test:e2e:ci
```

4. Rodar visual CI local:

```bash
npm run test:ui:ci
```

## TEST_SEED para CI

- O runner E2E define `TEST_SEED=1`.
- Isso garante dados mock em rotas criticas, sem depender de banco remoto.
- Objetivo: estabilidade no CI sem secrets de Supabase.

## Data test ids usados

- `workspace`
- `filter-rail`
- `detail-panel`
- `dock-nav`
- `density-toggle`
- `lens-toggle`
- `evidence-card`
- `timeline-item`
- `thread-item`
- `term-item`
- `map-node`
- `map-cluster`

## Escopo dos testes

- Render da lista/grid principal
- Selecao e abertura de detalhe
- Navegacao de CTAs entre telas
- Empty state para filtro impossivel
- Densidade `compact/normal`
- Navegacao por teclado (`ArrowDown`, `Enter`)

## Hardening operacional (OPS-01)

### Suites separadas
- `npm run test:e2e:ci` roda apenas `tests/e2e/ui-smoke.spec.ts`.
- `npm run test:ui:ci` roda apenas `tests/e2e/visual.spec.ts`.
- Isso evita que uma regressao de snapshot derrube a suite de smoke funcional.

### Porta dinamica no CI
- `npm run test:e2e:ci` tenta `3100` primeiro e cai para porta livre quando necessario.
- `npm run test:ui:ci` usa a mesma estrategia.
- Se voce vir log de fallback, isso nao e erro: o runner apenas evitou um conflito local.

### Snapshot mode estabilizado
- A suite visual roda com `UI_SNAPSHOT=1` e `NEXT_PUBLIC_UI_SNAPSHOT=1`.
- O helper visual espera:
  - ausencia de `skeleton`
  - ausencia de `route-progress`
  - `document.fonts.ready`
  - frames extras de render antes da captura
- Objetivo: reduzir falsos diffs, especialmente no mapa desktop.

### Limpeza local
- Rode `npm run clean:ops` antes de abrir PR se o workspace estiver cheio de artefatos temporarios.
