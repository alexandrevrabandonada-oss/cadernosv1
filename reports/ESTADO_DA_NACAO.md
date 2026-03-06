# Estado da Nacao — Cadernos Vivos
Data: 2026-03-05
Prompt: VIZ-17
Commit (se possivel): n/a

## 1) O que entrou neste tijolo
- Sessões de estudo por universo com persistencia local para visitante e base dedicada (`study_sessions` / `study_daily`) para usuario logado.
- Tracker leve acoplado ao layout do universo, reagindo a Focus Mode, Doc Viewer, trilhas, tutor e salvamento de highlights/notas.
- Recap em `/c/[slug]/meu-caderno/recap` com cards de Hoje, Semana, Ultimas sessoes, CTA de continuidade e recomendacoes deterministicas.
- Card discreto no hub quando ha atividade recente de estudo na semana.

## 2) Migrations study_sessions / study_daily
- Nova migration: `supabase/migrations/20260306090000_study_sessions_daily.sql`.
- `public.study_sessions` guarda metadados da sessao: `started_at`, `ended_at`, `duration_sec`, `focus_minutes`, `items`, `stats`.
- `public.study_daily` agrega por dia para streak util e recap semanal.
- RLS owner-only para `SELECT`, `INSERT` e `UPDATE` (`auth.uid() = user_id`).

## 3) Onde o tracker dispara
- Provider global do universo: `components/study/StudyTrackerProvider.tsx`, montado em `app/c/[slug]/layout.tsx`.
- Eventos automaticos por rota/contexto:
  - `doc_open`
  - `evidence_view`
  - `thread_view`
  - `event_view`
  - `focus_mode`
- Eventos instrumentados na UI:
  - `highlight_created` / `note_created` ao salvar no Meu Caderno
  - `trail_step_open` / `trail_step_done` em Trilhas
  - `tutor_point_open` / `tutor_ask` no Tutor
- Idle > 5 min ou `pagehide` fecha a sessao; visitante persiste local, logado envia patch para `/api/study`.

## 4) Rota recap
- Nova rota: `/c/[slug]/meu-caderno/recap`.
- Cliente de recap: `components/study/StudyRecapClient.tsx`.
- Visitante usa `localStorage` + agregacao local.
- Logado tenta `/api/study?universeSlug=...` e cai para fallback local se necessario.
- `Continuar no ponto X` usa o ultimo item tocado; se nao houver item com `href`, usa `last_section`.

## 5) Recomendacoes e privacidade
- Recomendacao deterministica em `lib/study/recommend.ts` sugere 2 nos e 3 evidencias publicadas a partir de `nodeSlug`, tags e secoes recentes.
- O tracker nao guarda texto integral de perguntas/respostas nem selecao textual completa; isso continua restrito a `user_notes`.
- Study Sessions nao entram em share pages e nao criam gamificacao competitiva.

## 6) Testes e docs
- Unit:
  - `tests/study-aggregate.test.ts`
  - `tests/study-recommend.test.ts`
- E2E:
  - `tests/e2e/ui-smoke.spec.ts` agora cobre highlight no doc chegando ao recap local.
- Docs:
  - `docs/STUDY.md`

## 7) Como testar
1. Abrir `/c/demo/doc/demo-doc-1`.
2. Criar um highlight real no texto.
3. Ir para `/c/demo/meu-caderno/recap`.
4. Confirmar contagem em Hoje/Semana e o CTA `Continuar`.
5. Exportar o notebook do Meu Caderno e verificar que os highlights do doc continuam no pack do proprio usuario.

## 8) Verificacoes finais
- `npm run verify`: ✅ PASSOU
- `npm run test:e2e:ci`: ✅ PASSOU
- `npm run test:ui:ci`: ✅ PASSOU

## 9) Observacoes
- Durante a execucao, continuam aparecendo warnings nao bloqueantes do Next sobre `themeColor` em metadata e `metadataBase` ausente em algumas share pages.
- Tambem persiste o warning do Sentry recomendando migracao de `sentry.client.config.ts` para `instrumentation-client.ts`.
- O primeiro disparo local de `npm run test:e2e:ci` bateu no timeout do executor, mas a repeticao com janela maior concluiu com `39 passed`.
