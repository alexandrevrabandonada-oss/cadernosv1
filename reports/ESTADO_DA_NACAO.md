# Estado da Nacao - Cadernos Vivos
Data: 2026-03-12
Prompt: ADM-UX-03
Commit (se possivel): n/a

## 1) O que entrou neste tijolo
- O board editorial foi refinado como central de operacao madura em `/admin/programa-editorial` e `/admin/programa-editorial/[slug]`.
- A logica principal foi preservada: o fluxo continua baseado em `editorial_programs`, `editorial_program_items` e `autoAssessUniverseLane`.
- A entrega prioriza leitura rapida, gargalos reais, acoes operacionais por universo e clareza do proximo passo da fila.

## 2) O que mudou no board
### Indice de programas
- a tela `/admin/programa-editorial` agora funciona como resumo executivo dos programas ativos
- cada programa mostra total de universos, cards em `review`, cards em `done` e atalhos para board e lote
- a linguagem saiu de lista tecnica e passou para tom de operacao editorial

### Hero operacional do board
- titulo e resumo do programa
- metricas rapidas de universos totais, `review`, `publish` e `done`
- CTAs para `Criar lote`, `Atualizar board` e `Aplicar sugestoes de lane`

### Saude do board
- counts por lane com destaque para lane mais congestionada
- leitura de `Onde esta travado`
- leitura de `Maior atraso`
- leitura de `Sem movimento recente`

### Board principal
- lanes com microcopy editorial curta
- cards de universo mais fortes, com titulo, resumo, template, prioridade, lane atual e sinais operacionais
- painel lateral com `Recomendados agora` e `Proximos movimentos`

## 3) Novos componentes de gargalo e saude
- `LaneHealthBadge`: badge de contagem por lane com destaque de gargalo
- `ProgramBlockerChip`: chips de bloqueio e prontidao operacional
- `UniverseOpsCard`: card editorial para leitura e acao rapida por universo

## 4) Lane sugerida mais legivel
- cada card passa a expor lane atual x lane sugerida
- o motivo da sugestao ficou legivel para operacao humana
- exemplos de mensagem:
  - docs importados, mas ainda sem processamento concluido
  - ha docs processed, mas a qualidade media ainda esta baixa
  - muitos drafts e pouca revisao
  - ja tem published + highlights, pronto para vitrine
- acoes disponiveis:
  - `Mover agora`
  - `Ignorar sugestao`

## 5) Como testar
1. Abrir `/admin/programa-editorial`.
2. Entrar em um board em `/admin/programa-editorial/[slug]`.
3. Revisar counts por lane na secao `Saude do board`.
4. Abrir um card de universo e validar badges, bloqueios e acoes rapidas.
5. Usar uma acao rapida como `Checklist`, `Review` ou `Highlights`.
6. Validar lane atual x lane sugerida e, se fizer sentido, mover o card.
7. Testar `Criar lote` no proprio board para inserir novos universos no programa.

## 6) Arquivos principais desta entrega
- `app/admin/programa-editorial/page.tsx`
- `app/admin/programa-editorial/[slug]/page.tsx`
- `components/admin/LaneHealthBadge.tsx`
- `components/admin/ProgramBlockerChip.tsx`
- `components/admin/UniverseOpsCard.tsx`
- `lib/editorial/program.ts`
- `app/globals.css`
- `tests/editorial-program.test.ts`
- `tests/e2e/ui-smoke.spec.ts`
- `docs/PROGRAMA_EDITORIAL.md`

## 7) Verificacoes finais
- `npm run verify`: ✅ Verify passou
- `npm run test:e2e:ci`: ✅ E2E passou
- `npm run test:ui:ci`: ✅ Visual passou

## 8) Observacao operacional
- O `test:e2e:ci` seguiu verde com 1 flaky antigo em fluxo restrito de `coletivos`, fora do escopo deste board premium.
- A baseline visual do runner mobile compacto foi atualizada para refletir a composicao nova sem alterar o fluxo principal do produto.
