# Accessibility

## O que foi reforcado
- Foco visivel mais forte em links, botoes e campos.
- Tap targets principais ajustados para faixa util de `44-48px`.
- Contraste refinado em microcopy, ghost buttons, badges e painéis de detalhe.
- `DockNav`, `DetailPanel`, `WorkspaceShell`, `SelectionToolbar` e `InstallPrompt` receberam semantica/aria complementar onde fazia falta.

## Componentes sensiveis
- `components/workspace/DockNav.tsx`
- `components/workspace/DetailPanel.tsx`
- `components/workspace/WorkspaceShell.tsx`
- `components/doc/SelectionToolbar.tsx`
- `components/pwa/InstallPrompt.tsx`

## Como validar
1. Navegar em viewport mobile e verificar foco visivel com teclado.
2. Conferir que controles principais mantem altura minima tocavel.
3. Validar leitura de textos e acoes em bottom sheets/drawers.
4. Confirmar que labels e nomes acessiveis continuam presentes em shell, doc viewer e instalacao PWA.

## Estados e acessibilidade
- Estados vazios, restritos, parciais e de erro agora usam titulos claros, descricao curta e CTA principal quando necessario.
- Todos os paines de estado usam `aria-live='polite'` no wrapper base para anunciar mudancas sem agressividade.
- Botoes e links de retomada mantem foco visivel e alvo de toque minimo.
- O criterio de contraste foi reforcado para microcopy de bloqueio, offline e confirmacoes inline.
