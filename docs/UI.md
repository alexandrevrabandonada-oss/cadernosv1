# UI System - Concreto Zen

## Direcao visual

- Estilo: urbano-industrial com base mineral clara e contraste alto.
- Objetivo: leitura nítida, navegação direta e componentes compactos.
- Textura: grade sutil via CSS puro (`--texture-grid`), sem imagens externas.

## Principios

- Contraste forte entre texto, superfícies e linhas estruturais.
- Foco visível em links, botões e tabs via `:focus-visible`.
- Área clicável mínima de 44px para interações primárias.
- Componentes leves, sem framework visual pesado.

## Tokens

Arquivo: `styles/tokens.css`

- Cores: `--bg-*`, `--surface-*`, `--text-*`, `--line-*`, `--brand-*`, `--alert-0`.
- Tipografia: `--font-sans`, `--font-mono`.
- Forma: `--radius-sm`, `--radius-md`, `--radius-lg`.
- Sombra: `--shadow-0`, `--shadow-1`.
- Espaçamento: `--space-1` ... `--space-6`.

## Componentes base

Pasta: `components/ui`

- `Button`: variantes `primary`, `neutral`, `ghost`; suporta `href` e `button`.
- `Card` / `Placa`: bloco de superfície principal.
- `Badge` / `Carimbo`: rótulo de estado curto.
- `SectionHeader`: título de seção com descrição e tag opcional.
- `Breadcrumb`: trilha de navegação com `aria-label`.
- `PortalLink`: bloco navegável para entrada em áreas do produto.
- `Segmented`: alternância de seções com semântica de tabs (`role='tablist'`).
- `Skeleton` / `LoadingBlock`: placeholders visuais de carregamento.

## Exemplo rapido

```tsx
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Segmented } from '@/components/ui/Segmented';

<Card className='stack'>
  <SectionHeader title='Mapa' description='Visao geral do universo' tag='Secao' />
  <Segmented label='Alternar secao' items={items} currentPath='/c/exemplo/mapa' />
</Card>;
```

## Aplicacao no app

- Header global com botões de navegação e contraste alto.
- QuickNav lateral para `/c/[slug]`.
- Hub e seções dinâmicas usam `Breadcrumb`, `SectionHeader` e `Segmented`.
- Loading states em `app/loading.tsx` e `app/c/[slug]/loading.tsx`.

## Highlight de citacoes no viewer

- Rota: `/c/[slug]/doc/[docId]?thread=<qa_thread_id>&cite=<citation_id>`.
- Comportamento:
  - sidebar com citacoes da thread para o documento.
  - navegacao anterior/proxima entre citacoes.
  - highlight do trecho em contexto (janela reduzida, nao renderiza chunk inteiro).
- Estrategia:
  - preferencia por offsets (`quote_start`, `quote_end`).
  - fallback por busca textual da quote no chunk.
  - se falhar, exibe aviso e mostra quote sem highlight automatico.

## Workspace 3-paineis

Pasta: `components/workspace`

- `WorkspaceShell`:
  - desktop: 3 colunas (FilterRail, conteudo, DetailPanel)
  - mobile: filtros em drawer + detalhe em bottom-sheet + DockNav fixo
- `FilterRail`:
  - wrapper padrao para filtros e controles de contexto
- `DetailPanel`:
  - painel direito no desktop
  - bottom-sheet no mobile
  - fecha no overlay, no botao e com tecla `ESC`
  - trap de foco simples quando aberto no mobile
- `DockNav`:
  - navegacao inferior mobile-first para secoes de `/c/[slug]/*`
- `useWorkspacePanels`:
  - sincroniza estado com query params:
    - `selected=<id>`
    - `panel=detail|filters`

### Query params padrao

- `selected`: item selecionado para detalhe
- `panel=detail`: abre painel de detalhe no mobile
- `panel=filters`: abre drawer de filtros no mobile
