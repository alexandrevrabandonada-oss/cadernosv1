# Estado da Nação — Cadernos Vivos
Data: 2026-03-05
Commit (se possível): n/a

## 1) O que mudou neste tijolo (PROD-13)
- Tracking de produto/impacto implementado com endpoint server-side e helper client.
- Dashboard por universo criado em `/admin/universes/[id]/analytics`.
- Resumo global de analytics adicionado em `/admin/status`.
- Instrumentação inicial de funil/CTAs/share aplicada em Hub, páginas de share e CTAs principais.

## 2) Migration de analytics
- `supabase/migrations/20260305050000_product_analytics.sql`
  - nova tabela `public.analytics_events`:
    - `universe_id`, `user_id`, `session_id`
    - `event_name`, `route`, `referrer_route`
    - `object_type`, `object_id`, `meta`
    - `created_at`
  - índices:
    - `(universe_id, created_at desc)`
    - `(event_name, created_at desc)`
    - `(session_id, created_at desc)`
    - `(object_type, object_id)`
    - `(route)`
  - RLS:
    - select: apenas `editor/admin`
    - insert direto bloqueado (`with check false`) para forçar escrita via servidor

## 3) Endpoint `/api/track` + sessão anônima
- Novo endpoint: `app/api/track/route.ts` (`POST`).
- Validação estrita de payload com whitelist de eventos em `lib/analytics/schema.ts`.
- Cookie de sessão anônima:
  - `cv_sid` (30 dias, `SameSite=Lax`) via `lib/analytics/session.ts`.
- Gating:
  - `universeSlug` só aceita universo publicado, ou preview editor/admin.
- Rate-limit:
  - 60 req/min por sessão+evento (`prefix=cv:track`).

## 4) Dashboard por universo
- Nova rota:
  - `/admin/universes/[id]/analytics`
- Agregações em `lib/analytics/dashboard.ts`:
  - últimas 24h:
    - `page_view`
    - `share_view`
    - `share_open_app`
    - taxa `share_open_app / share_view`
    - top 5 CTAs
  - últimos 7 dias:
    - funil `hub -> provas -> debate -> tutor -> share`
    - top 5 nós (`node_select`)
    - top 5 evidências (`evidence_click`)
    - nós com maior `insufficient` via `qa_threads.mode` por `node_id`

## 5) Instrumentação aplicada (nível inicial)
- Layout de universo:
  - `components/analytics/AnalyticsBridge.tsx`
  - `page_view` (e `share_view` nas rotas `/s/*`) por mudança de rota
  - tracking por delegação em elementos com `data-track-event`
  - `evidence_click`/`node_select` por `selected=` em Provas/Mapa
- CTAs com atributos de tracking:
  - Hub (`comecar_aqui`, `explorar_provas`, `abrir_tutor`, etc.)
  - Linha e Mapa (CTAs “Ver Provas/Linha/Debate”)
  - Share pages (`Abrir no app` e download de export)
- `ShareButton` passou a registrar `cta_click` (`compartilhar`) além do comportamento anterior.

## 6) Admin status (global)
- `/admin/status` ganhou card de analytics 24h:
  - page views
  - share views
  - share open app
  - universos com share open app
  - top universos por `share_open_app` (ids)

## 7) Testes adicionados/ajustados
- Unit:
  - `tests/analytics-track.test.ts`
    - validação de payload do tracking
    - geração/reuso de `cv_sid`
- E2E smoke:
  - teste novo para `POST /api/track`
  - teste de share page validando atributo de tracking + navegação “Abrir no app”

## 8) Docs
- Novo:
  - `docs/ANALYTICS.md`
- Atualizados:
  - `docs/API.md` (`POST /api/track`)
  - `docs/SECURITY.md` (seção de privacidade de analytics)

## 9) Como testar (manual)
1. Abrir um universo publicado e navegar por 3 telas (`/c/[slug]`, `/provas`, `/mapa`).
2. Abrir uma share page (`/c/[slug]/s/evidence/[id]`) e clicar em “Abrir no app”.
3. Acessar `/admin/universes/[id]/analytics` e verificar eventos no painel (24h/7d).

## 10) Verificações
- ✅ Verify passou
  - `npm run verify`
- ✅ E2E passou
  - `npm run test:e2e:ci` (executado com porta alternativa para evitar conflito local)
- ✅ Visual passou
  - `npm run test:ui:ci` (executado com porta alternativa)
