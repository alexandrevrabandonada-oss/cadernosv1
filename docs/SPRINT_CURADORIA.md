# Sprint de Curadoria

## Objetivo
Fechar rapidamente a cobertura dos nós core de um universo aplicando sugestões já geradas, de forma idempotente e auditável.

## Onde rodar
- Admin: `/admin/universes/[id]/sprint`

## O que o sprint faz
1. Ordena nós do pior para o melhor score de cobertura.
2. Garante sugestões por nó (quando necessário).
3. Aplica automaticamente, por nó:
- `node_documents` até a meta (default: 3), priorizando `processed` e melhor `text_quality_score`.
- `node_evidences` até a meta (default: 3), promovendo `node_evidence_suggestions` via chunks.
- `node_questions` até a meta (default: 3), usando sugestões curadas.
4. Ao final da execução real (não dry-run):
- registra auditoria em `curadoria_sprint_runs`
- grava log resumido
- regenera trilha `comece-aqui` para aproveitar evidências e perguntas novas.

## Dry-run
- Simula o efeito da rodada sem gravar mudanças estruturais.
- Útil para validar metas e capacidade antes de aplicar.

## Reversão (manual)
- Links de documento:
  - remover em `/admin/universes/[id]/links` (ou tela de links por nó).
- Evidências promovidas:
  - revisar em `/c/[slug]/provas?node=<nodeSlug>` e remover/desvincular no admin.
- Perguntas:
  - editar/remover no admin de links/curadoria.

## Boas práticas
- Rodar primeiro o Console da Demo:
  - importar fontes
  - enfileirar ingest
  - processar PDFs
- Executar sprint em modo `core`.
- Revisar evidências promovidas no Provas v2 antes de publicar.
- Conferir Checklist após cada rodada.

