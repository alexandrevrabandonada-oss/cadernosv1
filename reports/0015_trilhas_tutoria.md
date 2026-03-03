# Trilhas & Tutoria Report 0015

Data: 2026-03-03
Escopo: implementacao funcional de `/c/[slug]/trilhas` e `/c/[slug]/tutoria`.

## Trilhas

- Rota implementada:
  - `app/c/[slug]/trilhas/page.tsx`
- Funcionalidades:
  - listar trilhas (catalogo)
  - abrir trilha via query param `?trail=<slug>`
  - exibir etapas da trilha selecionada
  - cada etapa mostra instrucao, no sugerido e evidencia recomendada
- Fonte de dados:
  - `lib/data/learning.ts` (`getTrailsData`)
  - fallback mock quando DB nao estiver disponivel

## Tutoria

- Rota implementada:
  - `app/c/[slug]/tutoria/page.tsx`
- Componente cliente:
  - `components/tutoria/TutoriaPanel.tsx`
- Modos entregues:
  1. Tutoria de Leitura
     - mini-licoes
     - perguntas guiadas
     - evidencias recomendadas
  2. Tutoria de Percurso
     - passos com nos sugeridos
     - portas do universo recomendadas

## Progresso local

- Persistencia em `localStorage` (por enquanto), por universo:
  - chave: `cv:tutoria:<slug>:leitura`
  - chave: `cv:tutoria:<slug>:percurso`
- Progresso exibido em percentual para cada modo.

## Dados e fallback

- Nova camada:
  - `lib/data/learning.ts`
- Leitura do DB quando configurado:
  - `trails`, `trail_steps`
  - `tutor_modules`, `tutor_steps`
- Fallback mock robusto para manter UX funcional sem dados reais.

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
