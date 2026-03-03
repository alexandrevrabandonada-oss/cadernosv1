# Provas Report 0014

Data: 2026-03-03
Escopo: evolucao de `/c/[slug]/provas` com chunks paginados, filtros e curadoria de evidencias.

## Entregas

- Rota `/c/[slug]/provas` reimplementada:
  - `app/c/[slug]/provas/page.tsx`

- Funcionalidades:
  - listagem de chunks paginada
  - listagem de evidencias curadas
  - filtros:
    - por documento
    - por no (quando houver ligacao via `evidences.node_id/chunk_id`)
    - por ano
  - acao `Salvar como Evidencia`:
    - cria ou atualiza registro em `evidences`
    - usa server action com service role (somente server-side)
  - acao `Copiar citacao`:
    - formato padrao: `Documento (ano), p.x-y: "trecho"`
    - componente cliente: `components/provas/CopyCitationButton.tsx`

- Integracao de navegacao:
  - orientation bar + card de proximas portas mantidos no fluxo do universo.

## Seguranca

- Nenhum segredo no client.
- Escrita em `evidences` ocorre apenas no servidor.
- Botao de curadoria fica desabilitado quando admin/service role nao estao configurados.

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

- Aviso de deprecacao de `next lint` no Next 15.5.12 (nao bloqueante).
