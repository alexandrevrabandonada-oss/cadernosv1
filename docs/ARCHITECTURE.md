# Arquitetura - Cadernos Vivos

## Visao geral

Projeto Next.js com App Router e TypeScript, focado em uma base minima para evoluir o produto em camadas.

## Estrutura

- `app/`: rotas, layouts e paginas publicas.
- `components/`: componentes compartilhados de UI (`Header`, `QuickNav`).
- `lib/`: utilitarios e fabricas de componentes de pagina.
- `styles/`: tokens e estilos globais do tema "Concreto Zen".
- `docs/`: documentacao tecnica e de desenvolvimento.
- `tools/`: scripts utilitarios e automacoes futuras.
- `reports/`: relatorios de bootstrap/verificacao.

## Navegacao

- Header global fixo no `app/layout.tsx`.
- QuickNav injetado em `app/c/[slug]/layout.tsx`, visivel em todas as subrotas do universo.
- Home (`/`) funciona como catalogo publico de universos publicados.
- Enforcement de visibilidade de universo ocorre no layout de `/c/[slug]`.

## Rotas

- `/` Catalogo publico.
- `/c/[slug]` Hub do Universo.
- `/c/[slug]/mapa`
- `/c/[slug]/provas`
- `/c/[slug]/linha`
- `/c/[slug]/trilhas`
- `/c/[slug]/debate`
- `/c/[slug]/tutoria`
- `/admin` painel autenticado via Supabase Auth + RBAC.

## Governanca de visibilidade

- Campo canonico: `universes.published_at`.
- Regras:
  - `published_at is not null`: universo publico.
  - `published_at is null`: universo em rascunho.
- Publico anonimo so acessa universos publicados (RLS + guard de rota).
- `editor/admin` pode acessar rascunhos em modo preview para revisao.

## Estilo inicial

Tema "Concreto Zen" com tokens CSS em `styles/tokens.css`, sem bibliotecas de UI pesadas e sem imagens externas.
