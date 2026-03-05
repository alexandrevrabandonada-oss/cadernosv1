# Cadernos Vivos — Brand System

## Direcao
- Nome da direcao: `Concreto Zen // Arquivo Vivo`
- Identidade: arquivo vivo, instituicao editorial navegavel, rigor material.
- Relacao com VR Abandonada:
  - herda: materialidade urbana, tensao e leitura territorial.
  - nao replica: linguagem propria, menos panfleto, mais sistema editorial.

## Wordmark
- Componente: `components/brand/Wordmark.tsx`
- Variantes:
  - `hero`
  - `nav`
  - `compact`
  - `mono`
- Uso:
  - `nav`: header global
  - `hero`: blocos de entrada (Home/Hub)
  - `compact`: share pages, contextos densos

## Iconografia
- Arquivo: `components/brand/icons/BrandIcon.tsx`
- Set operacional:
  - salas: `provas`, `linha`, `debate`, `mapa`, `glossario`, `trilhas`, `tutor`
  - distribuicao: `share`, `export`
  - confianca/editorial: `confidence_strong`, `confidence_medium`, `confidence_weak`, `divergence`, `review`, `published`, `showcase`
- Tons:
  - `default`
  - `action`
  - `editorial`
  - `warning`

## Selos / carimbos
- `UniverseSeal`:
  - `showcase`, `published`, `review`
- `EvidenceSeal`:
  - `proof`, `curated`, `draft`, `review`, `published`
- `ConfidenceSeal`:
  - `forte`, `media`, `fraca`, `divergencia`
- Regras:
  - usar em contexto semantico real, nao como decoracao solta.
  - manter contraste minimo e legibilidade em mobile.

## Midia editorial
- Componente: `components/brand/EditorialMediaFrame.tsx`
- Objetivo:
  - evitar imagem crua sem tratamento.
  - manter moldura editorial com metadata curta.
- Recursos:
  - overlay controlado
  - fallback visual consistente
  - acento (`none`, `action`, `editorial`)

## Aplicacoes principais
- Header global: wordmark oficial.
- Home/Hub: wordmark + selos de vitrine/publicado + media frame.
- Workspace:
  - icone de sala no header
  - icones no DockNav.
- Provas/Debate:
  - selos de evidencia e confianca.
- Share pages + OG:
  - assinatura compacta e linguagem de marca.

## A11Y e variacoes
- Funciona com `data-texture="low"` e densidade compacta.
- Nao depender de textura para comunicar estado.
- Selo e icone sempre com texto/rotulo junto quando o contexto exigir clareza.
