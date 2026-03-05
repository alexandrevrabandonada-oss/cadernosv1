# Scheduler semanal de Share Pack

## Objetivo
Garantir ritmo operacional automático:
- criar/atualizar pack da semana
- inicializar canais pendentes
- registrar auditoria de execução

## Endpoint cron
- `POST /api/cron/weekly-pack`
- proteção obrigatória: header `x-cron-secret`
- secret: `CRON_SECRET`
- rate limit: `2/min`

## Fluxo da execução
1. Lista universos com `weekly_pack_enabled=true`.
2. Calcula `week_key` (`YYYY-W##`) no timezone configurado.
3. Para cada universo:
   - se pack da semana não existe: cria
   - se existe e não é pinned: regenera apenas quando incompleto (ou force manual)
   - garante `share_pack_posts` para canais configurados
   - garante checklist inicial da semana
   - grava run em `share_pack_runs`

## Tabelas
- `universe_distribution_settings`
- `share_pack_posts`
- `share_pack_runs`
- `share_pack_checklists` (já existente, usada no reset semanal)

## Operação no admin
- `/admin/universes/[id]/distribution`
  - ativa rotina semanal por universo
  - ajusta dia/hora/timezone/canais
  - executa “Rodar agora”
  - consulta histórico de semanas e runs
- `/admin/universes/[id]/share-pack`
  - seleciona semana
  - marca postado/skipped/pending por canal

## Vercel Cron
- Configurado em `vercel.json`:
  - `0 12 * * 1` para segunda às 12:00 UTC.
- Observação: horário local pode variar com DST; revisar se necessário.

