# Debate UI Report 0012

Data: 2026-03-03
Escopo: tela de debate interativa com perguntas, evidencias, visualizacao de documento e historico.

## Entregas

- Rota ` /c/[slug]/debate ` reimplementada:
  - `app/c/[slug]/debate/page.tsx`
  - inclui:
    - formulario de pergunta + botao
    - bloco de resposta
    - bloco "Evidencias"
    - historico de perguntas recentes
    - rodape "Proximas portas"

- Componente cliente de debate:
  - `components/debate/DebatePanel.tsx`
  - funcionalidades:
    - submit para `POST /api/ask`
    - loading skeleton (`LoadingBlock`)
    - render de resposta
    - evidencias com destaque em `<mark>`
    - link "Ver no documento" por evidencia
    - atualizacao local de historico apos nova pergunta

- Endpoint `/api/ask` ajustado:
  - retorno de citacoes agora inclui:
    - `docId`
    - `chunkId`
    - `pageStart`
    - `pageEnd`
    - alem de `doc`, `year`, `pages`, `quote`

- Nova rota de documento:
  - `app/c/[slug]/doc/[docId]/page.tsx`
  - abre visualizacao simples com:
    - metadados (titulo, autores, ano, status)
    - hint de pagina via query `?p=...`
    - link para abrir PDF do Storage (signed URL quando disponivel)
    - link para fonte original (quando houver)
    - botao de retorno ao debate

- Nova camada de dados de debate:
  - `lib/data/debate.ts`
  - busca contexto do universo, perguntas recentes e dados de documento

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
