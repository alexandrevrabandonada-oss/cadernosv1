# Testes Visuais (Playwright)

## Objetivo
Validar regressão visual das telas críticas do universo em duas dimensões:
- breakpoint: desktop e mobile
- preferências: `density/texture`

## Escopo atual
- `/c/[slug]/mapa?view=clusters`
- `/c/[slug]/provas`
- `/c/[slug]/linha`
- `/c/[slug]/debate`
- `/c/[slug]/glossario`
- `/c/[slug]/trilhas`

Matriz:
- desktop + `normal/normal`
- desktop + `compact/low`
- mobile + `normal/normal`
- mobile + `compact/low`

## Comandos
- Rodar snapshots local:
```bash
npm run test:ui
```

- Rodar snapshots em modo CI (seed determinística):
```bash
npm run test:ui:ci
```

- Atualizar baseline de snapshots:
```bash
npx playwright test --config=playwright.config.ts tests/e2e/visual.spec.ts --update-snapshots
```

## Boas práticas anti-flake
- Use `TEST_SEED=1` para dados determinísticos.
- Evite depender de relógio real/horário local.
- Snapshot só após `workspace` renderizar e `skeleton` desaparecer.
- Animações/transições são desabilitadas via helper antes da captura.
