# Estado da Nação — Cadernos Vivos
Data: 2026-03-04
Commit (se possível): n/a

## 1) O que mudou neste tijolo
- Implementado **Workspace 3-painéis** reutilizável:
  - `WorkspaceShell`
  - `DockNav`
  - `FilterRail`
  - `DetailPanel`
  - `useWorkspacePanels`
- Estilos novos de layout responsivo em `styles/workspace.css`.
- Aplicado o shell em:
  - `/c/[slug]/provas`
  - `/c/[slug]/linha`
  - `/c/[slug]/debate`
- Deep link por query params padronizado:
  - `selected=<id>`
  - `panel=detail|filters`
- Acessibilidade:
  - foco visível herdado do DS
  - `ESC` fecha painel de detalhe (bottom-sheet) e drawer de filtros no mobile
  - trap de foco simples no detail mobile.

## 2) Rotas
- `/c/[slug]/provas`
  - agora com trilho de filtros, lista central e detalhe de chunk no painel.
- `/c/[slug]/linha`
  - timeline no centro + detalhe de evento no painel.
- `/c/[slug]/debate`
  - formulário/resultado no centro + detalhe de pergunta recente no painel.
- Navegação mobile:
  - `DockNav` fixo com atalhos para Provas, Linha, Trilhas, Tutoria, Debate e Mapa.

## 3) Dados e DB (Supabase)
- Nenhuma migration nova neste tijolo.
- Mudança focada em UI/UX e organização de layout.

## 4) APIs / Jobs
- Nenhum endpoint novo obrigatório.
- Reuso de APIs existentes (`/api/ask` etc.) sem alteração de contrato.

## 5) UI/UX
- Desktop (`>= lg`):
  - grid 3 colunas: filtro / conteúdo / detalhe.
- Mobile (`< lg`):
  - filtros em drawer lateral
  - detalhe em bottom-sheet
  - dock inferior fixo.
- O shell inclui header compacto:
  - título/subtítulo da seção
  - botão “Filtros” no mobile
  - botão “Voltar ao Hub”.

## 6) Segurança
- Sem mudanças de auth/RLS.
- Navegação por query params não expõe dados novos; só controla estado de interface.

## 7) Como testar (passo a passo)
1. Abrir `/c/[slug]/provas` no desktop:
   - validar 3 painéis visíveis.
2. Abrir `/c/[slug]/provas` no mobile:
   - validar dock inferior;
   - abrir filtros no drawer;
   - clicar em item e confirmar `?selected=...&panel=detail` com detalhe no bottom-sheet.
3. Repetir o fluxo em `/c/[slug]/linha`:
   - clique em evento -> detalhe abre com `selected`.
4. Repetir em `/c/[slug]/debate`:
   - selecionar pergunta recente -> painel de detalhe.
5. Em mobile:
   - pressionar `ESC` com painel aberto (detalhe/filtros) e validar fechamento.

## 8) Pendências e próximos passos
1. Evoluir `filter=` em query param para filtros serializados (hoje foco em `selected/panel`).
2. Adicionar animação de transição suave entre itens selecionados no detalhe.
3. Expandir detalhes do debate para mostrar resposta/citações persistidas da pergunta selecionada.

✅ Verify passou
- Comandos executados:
  - `npm run verify`
