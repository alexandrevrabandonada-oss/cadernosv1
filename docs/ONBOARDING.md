# Onboarding Público (Comece Aqui)

## Objetivo
- Tornar cada universo "jogável" em poucos segundos.
- Dar um norte claro antes de abrir Mapa/Provas/Debate.

## Como funciona
- No Hub (`/c/[slug]`), o primeiro card é **Comece Aqui**:
  - resumo curto do universo
  - métricas rápidas: docs processados, nós, evidências
  - botão para trilha automática (`trail=comece-aqui`)
  - perguntas prontas (com `nodeSlug` quando aplicável)

## Perguntas prontas
- Fonte:
  1. 3 perguntas gerais determinísticas.
  2. Perguntas curadas em `node_questions` dos nós core.
  3. Fallback por template quando faltar pergunta curada.
- Clique leva para:
  - `/c/[slug]/debate?q=...&node=...`

## Debate com auto-disparo
- Quando `q` existe na query:
  - campo é preenchido automaticamente
  - `/api/ask` é disparado após debounce curto
  - se `node` vier, envia `nodeSlug` para boost de documentos vinculados ao nó

## Trilha automática "Comece Aqui"
- Helper: `ensureQuickStartTrail(universeId, slug)`.
- Idempotente:
  - se já existir `slug=comece-aqui`, não recria.
- Estrutura padrão (5 passos):
1. Visão geral do Hub
2. Explorar Mapa
3. Ler evidências-chave
4. Fazer perguntas guiadas
5. Revisar lacunas e próximas portas

## Operação (admin)
- Em `/admin/universes/[id]` existe o botão **Regerar Comece Aqui**:
  - recria apenas os steps da trilha `comece-aqui`
  - mantém o mesmo `trail_id`
