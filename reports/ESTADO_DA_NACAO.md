# Estado da Nacao — Cadernos Vivos
Data: 2026-03-06
Prompt: OPS-01
Commit (se possivel): n/a

## 1) O que entrou neste tijolo
- Hardening operacional do pipeline local/CI, sem mudanca de logica de produto.
- Runner E2E e runner visual agora resolvem porta livre antes de subir o app.
- Suite de smoke funcional foi separada da suite visual para reduzir falsos negativos.
- Metadata raiz foi ajustada para remover warnings de `themeColor` e padronizar `metadataBase`.
- Setup client do Sentry foi migrado para `instrumentation-client.ts`.
- Workspace ganhou higiene de artefatos com `.gitignore` mais completo e `npm run clean:ops`.

## 2) Porta dinamica e fallback do E2E
- Novo helper: `tools/find-free-port.mjs`.
- `tools/run-e2e-ci.mjs`:
  - tenta `3100` primeiro
  - cai para uma porta livre quando a preferida estiver ocupada
  - loga claramente quando houve fallback
  - roda apenas `tests/e2e/ui-smoke.spec.ts`
- `tools/run-ui-ci.mjs` usa a mesma estrategia para a suite visual.
- Validacao de fallback:
  - probe com listener local em `127.0.0.1:3100` retornou `{"port":3101,"requestedPort":3100,"usedFallback":true}`
  - ao rodar o runner com `3100` ocupado, o log confirmou `Porta 3100 ocupada. Usando fallback 3101.`

## 3) Warnings do Next e metadata
- `app/layout.tsx` deixou de declarar `themeColor` em `metadata` e manteve o valor em `viewport`, como o Next 15 exige.
- `app/layout.tsx` agora define `metadataBase` a partir de `NEXT_PUBLIC_SITE_URL` ou `VERCEL_URL`, com fallback local.
- Resultado: sairam os warnings recorrentes de `themeColor`/`metadataBase` do build.

## 4) Sentry client
- Migracao concluida de `sentry.client.config.ts` para `instrumentation-client.ts`.
- O setup client continua no-op quando nao ha DSN.
- O hook `onRouterTransitionStart` foi exportado para satisfazer o bootstrap recomendado do SDK.
- A sanitizacao de headers/cookies/body foi preservada.

## 5) Estabilizacao visual
- `playwright.config.ts` agora:
  - fixa `workers: 1`
  - permite controlar `retries` por env (`PLAYWRIGHT_RETRIES`)
  - sobe o dev server em `127.0.0.1` e porta explicita
- `tools/run-ui-ci.mjs` agora:
  - força `UI_SNAPSHOT=1`
  - força `NEXT_PUBLIC_UI_SNAPSHOT=1`
  - roda com `PLAYWRIGHT_RETRIES=0`
- `tests/e2e/helpers/visual.ts` agora espera:
  - ausencia de skeletons
  - ausencia de route progress
  - `document.fonts.ready`
  - frames extras de render antes do screenshot
- Resultado: `npm run test:ui:ci` ficou verde sem depender de retry milagroso.

## 6) Workspace hygiene
- `.gitignore` passou a ignorar:
  - `test-results/`
  - `playwright-report/`
  - `*.tsbuildinfo`
  - logs temporarios de verify/e2e/playwright
- Novo script:
  - `npm run clean:ops`
- O script remove apenas artefatos operacionais seguros e nao toca em `docs/` ou `reports/`.

## 7) Docs atualizados
- `docs/DEV.md`
- `docs/DEPLOY.md`
- `docs/TESTING_UI.md`
- `docs/SECURITY.md`

## 8) Como testar
1. Rodar `npm run verify`.
2. Rodar `npm run test:e2e:ci` com `3100` livre.
3. Rodar `npm run test:ui:ci` e verificar 4 snapshots verdes.
4. Simular `3100` ocupado e confirmar o log de fallback para outra porta livre.
5. Rodar `npm run clean:ops` e confirmar que artefatos temporarios somem do workspace.

## 9) Verificacoes finais
- `npm run verify`: ✅ Verify passou
- `npm run test:e2e:ci`: ✅ E2E passou
- `npm run test:ui:ci`: ✅ Visual passou

## 10) Observacoes
- Permanece apenas o warning conhecido do `next lint` sobre deprecacao futura do comando em Next 16.
- O build ainda mostra warnings de cache do webpack sobre serializacao de strings grandes, mas sem bloquear compilacao ou testes.
