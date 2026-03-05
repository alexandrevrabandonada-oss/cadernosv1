# Meu Caderno (Highlights + Notas)

## Objetivo
- Guardar estudo pessoal por universo sem expor publicamente.
- V1 salva apenas trechos existentes (evidence/citation/chunk/thread), sem selecao livre em PDF.

## O que salva
- `highlight`: trecho curto ancorado a uma origem.
- `note`: nota livre curta.

Campos principais:
- `kind`, `title`, `text` (clamp em 800 chars)
- `source_type`: `evidence|thread|citation|chunk|doc|event|term|node`
- `source_id` + `source_meta`
- `tags`

## Privacidade
- Dados pessoais de caderno **nao** entram em share pages.
- Logado: `public.user_notes` com RLS owner-only (`auth.uid() = user_id`).
- Visitante: localStorage por universo (`cv:user-notes:v1:<slug>`).

## Offline-first e sync
- Visitante: leitura/escrita local imediata.
- Logado:
  - carrega local + remoto
  - merge por hash/id
  - sync best-effort de itens pendentes via `/api/notes` (`action=sync`)

## Pontos de captura
- Provas detail (focus): `Salvar trecho`
- Debate detail:
  - `Salvar pergunta + achado`
  - `Salvar citacao`
- Tutor point lab (resposta guiada): `Salvar resposta`
- Doc viewer (citacao): `Salvar citacao`

## Tela
- Rota: `/c/[slug]/meu-caderno`
- Filtros: tipo, fonte, tags, busca
- Detalhe: edicao de texto/tags, deletar, `Abrir origem`
