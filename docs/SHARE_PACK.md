# Share Pack Semanal

## Objetivo
Gerar um pacote semanal de links publicos canonicos (`/c/[slug]/s/...`) pronto para distribuicao em WhatsApp, Telegram e Instagram.

## Tabela
- `public.share_packs`
  - `universe_id`
  - `week_key` (`YYYY-W##`)
  - `title`, `note`
  - `items` (`jsonb`) com `{type,id,url,label,note}`
  - `is_pinned`

RLS:
- leitura/escrita somente editor/admin.

## Geracao deterministica
Arquivo: `lib/share/pack.ts`

Selecao padrao:
1. `2` evidencias com prioridade para highlights e diversidade por no.
2. `1` evento (mais recente, priorizando highlight quando existir).
3. `1` thread `strict_ok` com melhor qualidade (`docs_used` alto e citacoes).
4. `1` termo relacionado ao no principal.
5. `1` no relacionado.
6. `1` export publico recente (opcional).

## Admin
Rota: `/admin/universes/[id]/share-pack`

Acoes:
- `Gerar pack da semana`
- `Regenerar`
- `Fixar/Desfixar`
- `Copiar texto do pack`
- `Copiar legenda Instagram`
- `Copiar texto WhatsApp`
- `Copiar texto Telegram`
- `Copiar thread X/Twitter`

## Checklist de postagem
- Persistido por pack em `public.share_pack_checklists`.
- Campos:
  - revisao de itens
  - canais postados (instagram/whatsapp/telegram)
  - lembrete semanal habilitado (modo instrucoes)
- Fallback:
  - se API/DB falhar, salva em `localStorage`.

## Lembrete semanal
- Bloco `Rotina` no painel permite ativar/desativar lembrete.
- v1 usa **modo instrucoes** (confirmacao em UI + texto copiavel), sem scheduler externo automatico.
- Rotina sugerida:
  - segunda 09:00 (America/Sao_Paulo)
  - abrir `/admin/universes/[id]/share-pack`
  - gerar pack se necessario
  - revisar item 1 e 2
  - postar Instagram, WhatsApp e Telegram.

Comportamento:
- pack fixado bloqueia regeneracao ate desfixar.
- geracao eh idempotente por `(universe_id, week_key)`.

## Histórico semanal
- Seletor de semana no topo da tela `/share-pack`.
- Abas históricas via rota:
  - `/admin/universes/[id]/share-pack?week=YYYY-W##`
- Estado por canal:
  - `pending`, `posted`, `skipped`
  - `posted_at`, `post_url`, `note`

## API de leitura (smoke/publica)
- `GET /api/share-pack?u=<slug>`
- retorna o pack semanal para universo publicado (ou fallback `TEST_SEED=1`).
- usada para smoke E2E de validade dos links.

## API de legendas (protegida)
- `GET /api/share-pack/caption?u=<slug>&channel=instagram|whatsapp|telegram|twitter`
- acesso somente editor/admin.

## API de checklist (protegida)
- `GET /api/share-pack/checklist?packId=<id>`
- `PATCH /api/share-pack/checklist`

## Rotina operacional
- Painel dedicado: `/admin/universes/[id]/distribution`
- Configure:
  - `weekly_pack_enabled`
  - dia/hora/timezone
  - canais ativos
- Rode manual:
  - botão `Rodar agora`
  - ou cron (`/api/cron/weekly-pack`)

## Uso em redes
1. Gere ou atualize o pack no admin.
2. Clique `Copiar texto do pack`.
3. Poste a lista numerada com os links canonicos.
4. (Opcional) fixe o pack para manter a semana congelada.
