# Catalogo Vivo

## Objetivo

A Home publica (`/`) deve funcionar como vitrine viva de universos realmente publicados, com foco editorial simples e sem depender de mock quando ja existe conteudo real.

## Campos editoriais por universo

Migration: `supabase/migrations/20260311100000_universes_featured_focus.sql`

- `is_featured`: coloca o universo na vitrine prioritaria.
- `featured_rank`: ordena os universos featured na Home.
- `focus_note`: frase curta opcional para o hero/foco.
- `focus_override`: força o universo a assumir o `Universo em foco` quando estiver publicado.

## Ordem editorial da Home

Engine: `lib/catalog/homeEditorial.ts`

1. Universo publicado com `focus_override=true`.
2. Universo publicado com `is_featured=true` e melhor `featured_rank`.
3. Demais universos publicados, ordenados por sinais reais e recencia.

## O que a Home puxa

- `focusUniverse`
- `featuredUniverses[]`
- `signals[]`

Os sinais priorizam diversidade entre:
- provas
- eventos
- perguntas
- termos
- nos
- share pack semanal

## Admin

Rota: `/admin/universes/featured`

Permite:
- marcar/desmarcar `featured`
- ajustar `featured_rank`
- definir `focus_override`
- editar `focus_note`

A rota e restrita a editor/admin. Em `TEST_SEED=1` sem service role, funciona como painel de leitura seedado para validar a ordem editorial sem persistencia.

## Fallback

Quando `hasPublishedUniverses=false`:
- a Home usa fallback editorial elegante
- para admin/logado, o CTA aponta para a gestao da vitrine
- para publico, o CTA aponta para entendimento da plataforma ou login

## Como operar

1. Publicar um universo.
2. Marcar `featured` nos universos que devem aparecer primeiro.
3. Ajustar `featured_rank` para ordenar a estante publica.
4. Usar `focus_override` apenas quando um universo precisa assumir o hero da Home.
5. Escrever `focus_note` curta e objetiva quando o recorte publico exigir contexto extra.

## Bootstrap e catalogo

- Um universo criado por bootstrap nasce com `published=false` e nao entra automaticamente na Home.
- Isso permite preparar Hub, trilhas, glossario e coletivos antes de expor o universo na vitrine publica.
- Mesmo quando o template gera estrutura editorial completa, o universo so entra no catalogo vivo depois de publicado.
