# Busca universal e Command Palette 2.0

## O que entra na busca
- Nodes
- Termos do Glossario
- Docs
- Evidences
- Events
- Threads
- Meu Caderno (`user_notes`) quando o usuario estiver logado
- Meu Caderno local quando o visitante estiver usando o app offline-first

## Endpoint
- `GET /api/search`
- Params:
  - `u=<universeSlug>`
  - `q=<query>`
  - `types=node,term,doc,evidence,event,thread,note`
  - `limit=20`
- Retorno:
  - `results[]` com `type`, `title`, `subtitle`, `snippet`, `href`, `badges`
  - `meta.countsByType`

## Privacidade
- Resultados de `note` no server so aparecem para o proprio usuario autenticado.
- Visitante nao recebe notas privadas pelo endpoint.
- Visitante ainda pode buscar notas locais no client via localStorage, sem enviar esse conteudo para o servidor.
- Queries nao sao persistidas.

## Sintaxe da palette
- `/`: abre a palette
- `Ctrl/Cmd + K`: abre a palette
- `@texto`: filtra para Meu Caderno
- `#tag`: aplica filtro por tag
- chips de tipo: limitam a busca para os grupos marcados

## Regras de ranking
- `startsWith` ganha de `contains`
- match em titulo ganha de snippet
- nodes/termos recebem boost leve de relevancia
- evidences publicadas recebem boost
- `@` aumenta o peso de notas/highlights
- a resposta limita diversidade por tipo para evitar 20 resultados do mesmo grupo

## Fluxo de navegacao
- Node -> Mapa com `node` selecionado
- Term -> Glossario com detalhe aberto
- Doc -> viewer do documento
- Evidence -> Provas com item selecionado
- Event -> Linha com evento selecionado
- Thread -> Debate com thread selecionada
- Note/highlight -> origem do item ou Doc Viewer com `?hl=` quando for highlight de documento
