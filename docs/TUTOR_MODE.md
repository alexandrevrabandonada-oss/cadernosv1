# Tutor Mode v1

## Objetivo
- Entregar tutoria ponto a ponto, com checkpoint e progresso real.
- Reaproveitar o planner v0 sem depender de LLM extra.

## Rotas
- `/c/[slug]/tutor`
- `/c/[slug]/tutor/s/[sessionId]`
- `/c/[slug]/tutor/s/[sessionId]/p/[index]`
- `/c/[slug]/tutor/s/[sessionId]/done`

## Fluxo v1
1. Usuário inicia sessão em `/c/[slug]/tutor`.
2. Sessão abre em `/s/[sessionId]` com visão dos pontos.
3. Cada ponto (`/p/[index]`) exige:
   - abrir evidências obrigatórias
   - rodar pergunta guiada inline (`/api/ask`, com `nodeSlug` quando existir)
   - concluir checkpoint
4. Ao concluir ponto:
   - avança `current_index`
   - no último ponto, sessão vira `done` e abre `/done`.

## Tutor Chat dentro do ponto
- Cada ponto possui uma seção **Tutor Chat** para follow-ups.
- O chat e evidence-first:
  - primeiro prioriza `required_evidence_ids` do ponto
  - depois docs vinculados ao no (`node_documents`)
  - por ultimo fallback para o universo geral
- O chat nao substitui a **pergunta guiada** do checkpoint (mantem a pedagogia).
- Logs de ask guardam `source='tutor_chat'` e metadados de escopo.

## SummaryAgent (sessao concluida)
- Quando a sessao chega em `done`, o app gera um resumo consolidado (owner):
  - pontos cobertos
  - principais achados com referencia a evidencias/threads
  - limitacoes/lacunas
  - proximos passos (nos, trilha, evidencias)
- Persistencia para logado:
  - `tutor_session_summaries`
- Visitante:
  - resumo simplificado local (sem persistencia no banco).
- Export opcional:
  - `Gerar Dossie da Sessao` (MD+PDF) via sistema de exports.

## Persistência
- Visitante:
  - `localStorage` (`cv:tutor-v1:<slug>:<sessionId>`)
  - chat do ponto em `cv:tutor-chat-v1:<slug>:<sessionId>:<pointId>`
- Logado:
  - `tutor_sessions` (`current_index`, `status`, `done_at`)
  - `tutor_points` (`status`, `completed_at`, `last_thread_id`)
  - `tutor_chat_threads` e `tutor_chat_messages`
  - RLS por ownership (`auth.uid() = user_id`)

## Regras de checkpoint
- Evidências:
  - se houver até 2 evidências obrigatórias: precisa abrir todas
  - se houver 3+: precisa abrir pelo menos 2
- Pergunta guiada:
  - obrigatória quando o ponto possui `guided_questions`
- Só libera “Concluir ponto” quando ambos os critérios passam.

## Integracao com Trilhas v2
- Em `/c/[slug]/trilhas`, trilhas com `guided_question` ou `required_evidence_ids` recebem badge `Tutor-ready`.
- CTA `Abrir no Tutor`:
  - redireciona para `/c/[slug]/tutor` para continuar sessao existente ou iniciar nova.
- No modo player de trilhas, o painel de detalhe inclui atalho direto para o Tutor.

## Arquivos principais
- Planner: `lib/tutor/planner.ts`
- Actions server: `app/actions/tutor.ts`
- Estado client: `hooks/useTutorSession.ts`
- UI:
  - `components/tutor/TutorModePanel.tsx`
  - `components/tutor/TutorSessionOverview.tsx`
  - `components/tutor/TutorPointLab.tsx`
  - `components/tutor/TutorDoneSummary.tsx`
