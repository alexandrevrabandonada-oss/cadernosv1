# Estado da Nacao — Cadernos Vivos
Data: 2026-03-06
Prompt: VIZ-20
Commit (se possivel): n/a

## 1) O que entrou neste tijolo
- Passe transversal de qualidade de estados para reduzir cara de produto inacabado em empty, error, restricted, partial/offline e success.
- Novo kit reutilizavel em `components/ui/state/` para padronizar estrutura, microcopy, CTA e camadas visuais dos estados.
- Refinos aplicados primeiro nos pontos mais sensiveis: offline, not-found, erro global, preview de universo, export privado, recap, coletivos, review e analytics.
- Smoke E2E ampliado com estados criticos de Home, Provas, coletivo restrito, offline e export privado.

## 2) Componentes de estado criados/refinados
- `components/ui/state/StatePanel.tsx`
- `components/ui/state/EmptyStateCard.tsx`
- `components/ui/state/ErrorStateCard.tsx`
- `components/ui/state/RestrictedStateCard.tsx`
- `components/ui/state/SuccessInlineNotice.tsx`
- `components/ui/state/PartialDataNotice.tsx`
- `components/ui/EmptyState.tsx` agora delega para o novo card e melhora varias telas herdadas de uma vez.
- `app/globals.css` ganhou estilos comuns para tons `empty`, `error`, `restricted`, `success` e `partial`, alem de heading semantico no painel base.

## 3) Telas impactadas
- `/`
  - estado vazio do catalogo ficou mais editorial e orientado a acao.
- `/offline` e `OfflineBanner`
  - explicam claramente o que segue disponivel em cache e o que pode falhar sem conexao.
- `/_not-found` e erro global
  - trocados por paineis sem placeholder seco, com CTA de retomada.
- `/c/[slug]` preview
  - gating de universo nao publicado virou bloco de restricao claro e elegante.
- `/c/[slug]/exports/[exportId]`
  - export privado e link assinado indisponivel agora usam estados especificos, sem mensagem crua.
- `/c/[slug]/meu-caderno/recap`
  - vazios e dados insuficientes ficaram mais explicitos em sessoes, semana e recomendacoes.
- `/c/[slug]/coletivos` e `/c/[slug]/coletivos/[id]`
  - vazios e falta de acesso passaram a usar estados coerentes com governanca.
- `/c/[slug]/coletivos/[id]/review`
  - fila vazia, item nao selecionado, auditoria vazia e sucesso pos-acao ganharam feedback contextual.
- `/admin/universes/[id]/analytics`
  - blocos sem massa critica agora deixam claro que sao estados parciais, nao erros.

## 4) Offline, partial e success
- Offline page e banner agora distinguem shell disponivel vs dados ao vivo indisponiveis.
- `SuccessInlineNotice` entrou na fila editorial para feedback mais duravel apos status change/promocao.
- `PartialDataNotice` entrou no recap e analytics para casos de historico curto ou falta de sinal suficiente.
- `getExportViewBySlug()` recebeu fallback controlado em `TEST_SEED=1` para validar export privado no smoke.

## 5) Como testar
1. Abrir Home com um recorte vazio e conferir o estado do catalogo (`/?q=zzzxxyynotfound`).
2. Abrir `/c/demo/provas?q=zzzxxyynotfound` e validar empty state de resultados.
3. Abrir `/c/demo/coletivos/sem-acesso` e confirmar o estado restrito.
4. Abrir `/offline` e validar texto de disponibilidade parcial + CTA de volta.
5. Abrir `/c/demo/exports/demo-export-private` e confirmar o bloqueio de export privado.
6. Abrir `/c/demo/meu-caderno/recap` sem historico suficiente e revisar notices de recap parcial.

## 6) Docs atualizadas
- `docs/UI.md`
- `docs/ACCESSIBILITY.md`
- `docs/STATES.md`

## 7) Verificacoes finais
- `npm run verify`: ✅ Verify passou
- `npm run test:e2e:ci`: ✅ E2E passou
- `npm run test:ui:ci`: ✅ Visual passou

## 8) Observacoes
- O passe nao adicionou features novas nem mudou arquitetura de produto.
- O `StatePanel` agora expoe heading semantico, o que ajudou a acessibilidade e estabilizou o smoke offline.
- Permanecem apenas ruídos operacionais ja conhecidos:
  - aviso de deprecacao do `next lint` para Next 16
  - warnings nao bloqueantes do webpack cache sobre serializacao de strings grandes
