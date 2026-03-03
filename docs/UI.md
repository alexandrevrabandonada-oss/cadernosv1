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
