# Tutoria 2.0

## Objetivo
- Transformar trilhas em mini-laboratórios de aprendizagem.
- Cada passo pode ter:
  - leituras obrigatórias (evidências)
  - pergunta guiada
  - checkpoint de conclusão

## Modelo de dados
- `trail_steps` (campos opcionais):
  - `required_evidence_ids uuid[]`
  - `guided_question text`
  - `guided_node_id uuid`
  - `requires_question boolean`
- Progresso logado:
  - `user_trail_progress` (por usuário/passo)
  - RLS: cada usuário lê/escreve apenas seu progresso

## UX pública
- Em `/c/[slug]/trilhas?trail=...`:
  - progresso `X/Y`
  - abrir evidência obrigatória
  - executar pergunta guiada em `/c/[slug]/debate?q=...&node=...`
  - marcar passo como concluído
- Se `requires_question=true`, o passo exige execução da pergunta guiada antes de concluir.

## Persistência de progresso
- Anônimo:
  - `localStorage` por `universeSlug + trailId`
- Logado:
  - `localStorage` + persistência best-effort em `user_trail_progress` (server action)

## Edição no admin
- Rota: `/admin/universes/[id]/trilhas`
- Permite configurar tarefas por passo:
  - evidências obrigatórias (CSV de ids, até 3)
  - pergunta guiada
  - nó guiado
  - `requires_question`

