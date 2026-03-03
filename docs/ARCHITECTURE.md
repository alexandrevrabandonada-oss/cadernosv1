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

## Rotas

- `/` Home.
- `/c/[slug]` Hub do Universo.
- `/c/[slug]/mapa`
- `/c/[slug]/provas`
- `/c/[slug]/linha`
- `/c/[slug]/trilhas`
- `/c/[slug]/debate`
- `/c/[slug]/tutoria`
- `/admin` placeholder controlado por feature flag (`NEXT_PUBLIC_ADMIN_ENABLED` ou `ADMIN_ENABLED`).

## Estilo inicial

Tema "Concreto Zen" com tokens CSS em `styles/tokens.css`, sem bibliotecas de UI pesadas e sem imagens externas.