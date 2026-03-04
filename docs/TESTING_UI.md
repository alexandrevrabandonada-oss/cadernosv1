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

