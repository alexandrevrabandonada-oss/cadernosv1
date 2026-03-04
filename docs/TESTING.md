# Testing

## Objetivo
Suite minima de regressao para proteger o core sem depender de Supabase cloud.

## Comandos
- `npm run test`: roda todos os testes com Vitest.
- `npm run test:ci`: mesma suite com reporter enxuto para CI.
- `npm run verify`: lint + typecheck + build.

## Escopo atual
- `tests/rerank.test.ts`
  - diversidade por documento
  - limite maximo por documento
  - fallback com apenas 1 documento
- `tests/compose.test.ts`
  - resposta com secoes `Achados`, `Limitacoes`, `Citacoes`
  - comportamento em `insufficient`
- `tests/ratelimit.test.ts`
  - fallback in-memory (sem Redis)
  - bloqueio apos limite
- `tests/api-ask.test.ts`
  - payload invalido => 400
  - rate limit excedido => 429
  - modo `insufficient`
  - modo `strict_ok` com `threadId`, `citationId`, offsets
- `tests/universe-visibility.test.ts`
  - `isUniversePublished`
  - gate de preview/publico no layout de universo

## Mock vs Integracao
- Sem dependencias de cloud: Supabase, Redis e Sentry sao mockados quando necessario.
- Os testes de `/api/ask` exercitam o handler real e mockam somente as dependencias externas.
- Os testes unitarios de `rerank`, `compose` e `rateLimit` usam implementacao real.

## Como adicionar testes sem inflar a suite
1. Priorize funcoes puras e handlers server-side.
2. Mocke apenas I/O externo (DB, rede, storage).
3. Evite fixture grande; monte dados pequenos por caso.
4. Garanta runtime curto (objetivo: suite < 10s em CI comum).
