# Showcase do Universo

## Objetivo
Transformar um universo em vitrine publica com highlights claros e jornada inicial forte no Hub.

## Estrutura do kit de vitrine
- 6 evidencias destacadas
- 3 perguntas destacadas
- 3 eventos da linha destacados

Dados ficam em `universe_highlights`.

## Onde editar
- Admin: `/admin/universes/[id]/highlights`

## Fluxo recomendado
1. Rodar pipeline operacional:
   - import -> ingest -> qualidade -> sprint.
2. Abrir Highlights e usar `Auto-selecionar destaques`.
3. Revisar manualmente os itens.
4. Clicar `Publicar como vitrine`.

## Gate de publicacao
- A publicacao de vitrine roda checklist server-side.
- Com FAIL critico:
  - `force=false`: bloqueia.
  - `force=true` (admin): publica com warning registrado em log.
- Se kit estiver vazio no publish:
  - auto-pick e upsert dos highlights antes de publicar.

## Minimo recomendado antes de publicar
- Checklist sem FAIL critico.
- >= 3 docs/evidencias/perguntas nos nós core principais.
- Hub com seção `Destaques` preenchida e links navegando para Provas/Linha/Debate.

