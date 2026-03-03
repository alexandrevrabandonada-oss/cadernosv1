# Universe Nav Report 0003

Data: 2026-03-03
Escopo: reforco da UX de navegacao do Universo nas rotas `/c/[slug]*`.

## O que foi implementado

- Mock central em `lib/mock/universe.ts`:
  - titulo e resumo do universo por `slug`;
  - nucleo com 7 nos mock (conceito, evento, pessoa, evidencia);
  - metadados de portais (descricao + CTA) para Mapa/Provas/Linha/Trilhas/Debate/Tutoria.

- Hub `/c/[slug]`:
  - exibe titulo do universo e resumo;
  - exibe bloco de nucleo (5-9 nos mock);
  - exibe blocos de portais para as secoes.

- Orientation bar em todas as telas `/c/[slug]/*`:
  - breadcrumb;
  - botao de voltar ao Hub;
  - atalhos de secao (segmented/tablist).
  - implementado via `components/universe/OrientationBar.tsx`.

- Componente `Portais`:
  - cards com CTA para navegacao;
  - usado no Hub e no rodape de cada secao como `Proximas portas`;
  - implementado via `components/universe/Portais.tsx`.

## Arquivos principais alterados

- `lib/mock/universe.ts` (novo)
- `components/universe/OrientationBar.tsx` (novo)
- `components/universe/Portais.tsx` (novo)
- `app/c/[slug]/page.tsx`
- `lib/sectionPage.tsx`
- `app/globals.css`

## Verificacao

Comando executado:

```bash
npm run verify
```

Resultado:

- `lint`: OK
- `typecheck`: OK
- `build`: OK

Observacao:

- Aviso de deprecacao de `next lint` (nao bloqueante no Next 15.5.12).
