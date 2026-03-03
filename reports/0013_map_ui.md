# Map UI Report 0013

Data: 2026-03-03
Escopo: evolucao de `/c/[slug]/mapa` com visual interativo, filtros e painel lateral.

## Entregas

- Mapa interativo criado:
  - `components/map/MapExplorer.tsx`
  - renderiza:
    - nos em grid
    - conexoes com linhas SVG suaves
    - busca por no (titulo/resumo/tags)
    - filtro por tags
    - selecao de no com painel lateral

- Painel lateral por no:
  - descricao do no
  - tags
  - documentos relacionados (heuristica por chunks contendo titulo do no)
  - portais:
    - Provas (filtrado por `node`)
    - Linha (eventos)
    - Debate (pergunta sugerida via query `q`)

- Dados do mapa enriquecidos:
  - `lib/data/universe.ts`
    - `getMapData` agora retorna `slug`, `summary`, `tags` por no
    - novo helper `getNodeRelatedDocuments(...)` para docs relacionados

- Mock enriquecido:
  - `lib/mock/universe.ts`
  - nos mock agora com `slug`, `summary`, `tags`

- Rota de mapa atualizada:
  - `app/c/[slug]/mapa/page.tsx`
  - integra `MapExplorer` e documentos relacionados

- Debate recebeu suporte a pergunta sugerida:
  - `app/c/[slug]/debate/page.tsx` (leitura de `searchParams.q`)
  - `components/debate/DebatePanel.tsx` (prop `initialQuestion`)

- Estilo visual do mapa:
  - `app/globals.css`
  - classes para workbench, canvas, grid, linhas SVG e painel lateral

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

- Aviso de deprecacao do `next lint` no Next 15.5.12 (nao bloqueante).
