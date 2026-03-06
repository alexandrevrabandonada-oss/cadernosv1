# Relatorio Completo do Estado Atual do Projeto
Data: 2026-03-06
Projeto: Cadernos Vivos
Branch: main
Head: 6ca7c4c11f3570acd324189683ac7044ba71d3b3

## Resumo executivo
O projeto esta em um estado avancado de produto e operacao. A base Next.js + Supabase sustenta um fluxo completo de universo editorial, consumo publico, estudo individual offline-first, exportacao, busca universal, estudo com recap e colaboracao em coletivos com review editorial.

A entrega mais recente amplia a camada colaborativa com templates de coletivos, criacao rapida, review coletivo e promocao editorial. O sistema ja tem governanca por RLS, rotas publicas e admin separadas, exportacao MD/PDF, trilhas, tutoria, glossario, debate, provas, linha do tempo e observabilidade minima.

O estado atual e bom para continuidade de produto, mas ainda ha passivos tecnicos conhecidos: warnings recorrentes de metadata no Next, aviso de migracao do Sentry para `instrumentation-client.ts`, flakiness visual em snapshot desktop e bloqueio eventual do e2e quando a porta `3100` ja esta ocupada.

## Inventario rapido
- Stack: Next.js 15 App Router, React 18, TypeScript, Supabase, Playwright, Vitest, Sentry.
- Scripts principais: `dev`, `build`, `verify`, `test`, `test:e2e:ci`, `test:ui:ci`, `db:push`, `db:deploy`.
- Paginas `app/**/page.tsx`: 51
- Endpoints `app/api/**/route.ts`: 24
- Migrations versionadas: 45
- Documentos em `docs/`: 39
- Pasta `reports/`: historico incremental + estado da nacao corrente.

## Arquitetura atual
### Aplicacao
- Frontend e backend no mesmo repositorio via Next.js App Router.
- Rotas publicas por universo em `/c/[slug]`.
- Rotas de administracao em `/admin` e `/admin/universes/[id]`.
- APIs internas em `app/api/*` para busca, notas, estudo, export, share pack, coletivos e ingest.
- Dados persistidos em Supabase com RLS forte e fallback/mock/localStorage em fluxos offline-first.

### Camadas principais
- `app/`: paginas, layouts e route handlers.
- `components/`: UI de produto, admin, doc viewer, notebook, coletivos, tutor, search, export.
- `lib/`: data layer, ranking, review, export, study tracking, mocks, status, checklist, share.
- `supabase/migrations/`: evolucao do schema e politicas.
- `tools/`: seed demo, import, wrappers de CI e Supabase CLI.
- `docs/`: operacao, arquitetura, seguranca, offline, estudo, busca, colaboracao e export.

## Modulos de produto implementados
### Catalogo e universos
- Catalogo publico na home.
- Hub do universo em `/c/[slug]`.
- Gating de publicacao com `published_at` e regras de acesso.

### Mapa, Linha, Provas, Debate, Glossario
- Mapa com cobertura e navegacao por nos.
- Linha do tempo com eventos.
- Provas evidence-first com filtros e links profundos.
- Debate com threads e acoes contextuais.
- Glossario com busca e CTAs para o resto do universo.

### Doc Viewer e highlights reais
- Viewer de texto com selecao real de trecho.
- Toolbar flutuante para destacar, anotar e copiar.
- Persistencia offline-first para highlights/notas.
- Reancoragem por offsets e anchor em texto renderizado.

### Meu Caderno
- Notes e highlights privados com suporte visitante/logado.
- Focus Mode friendly.
- Export do pack de estudo em MD/PDF.
- Recap por universo com sessoes e continuidade.

### Busca universal e command palette
- Busca universal com nodes, terms, docs, evidences, events, threads e user notes.
- Sintaxe `@` para Meu Caderno e `#` para tags.
- Endpoint server-side dedicado e ranking deterministico.

### Study Sessions e recap
- Rastreamento de sessoes de estudo por universo.
- Agregacao diaria para minutos focados, dias ativos e itens estudados.
- Recap em `/c/[slug]/meu-caderno/recap`.
- Recomendacoes deterministicas e CTA de continuidade.

### Colaboracao e review editorial
- Coletivos em `/c/[slug]/coletivos`.
- Detalhe do coletivo em `/c/[slug]/coletivos/[id]`.
- Review editorial em `/c/[slug]/coletivos/[id]/review`.
- Templates de criacao rapida em `/c/[slug]/coletivos/novo`.
- Adicao de itens vindos de Meu Caderno, Provas, Debate, Tutor e Doc Viewer.
- Promocao editorial para evidence, node question, glossary term e event em fluxo draft/review.

### Admin e operacao
- Checklist do universo.
- Curadoria assistida.
- Review editorial de evidencias.
- Share Pack semanal.
- Distribuicao, highlights de vitrine, analytics e status operacional.

## Rotas principais disponiveis
### Publico/produto
- `/`
- `/c/[slug]`
- `/c/[slug]/mapa`
- `/c/[slug]/provas`
- `/c/[slug]/linha`
- `/c/[slug]/debate`
- `/c/[slug]/glossario`
- `/c/[slug]/doc/[docId]`
- `/c/[slug]/trilhas`
- `/c/[slug]/tutor`
- `/c/[slug]/meu-caderno`
- `/c/[slug]/meu-caderno/recap`
- `/c/[slug]/coletivos`
- `/c/[slug]/coletivos/novo`
- `/c/[slug]/coletivos/[id]`
- `/c/[slug]/coletivos/[id]/review`
- `/c/[slug]/s/*` para shares publicos controlados

### Admin
- `/admin`
- `/admin/status`
- `/admin/universes`
- `/admin/universes/[id]`
- `/admin/universes/[id]/docs`
- `/admin/universes/[id]/nodes`
- `/admin/universes/[id]/links`
- `/admin/universes/[id]/review`
- `/admin/universes/[id]/share-pack`
- `/admin/universes/[id]/checklist`
- `/admin/universes/[id]/assistido`
- `/admin/universes/[id]/glossario`
- `/admin/universes/[id]/distribution`
- `/admin/universes/[id]/trilhas`

## APIs implementadas
### Produto
- `/api/ask`
- `/api/notes`
- `/api/palette`
- `/api/search`
- `/api/study`
- `/api/track`
- `/api/user/ui-settings`
- `/api/export/notebook`
- `/api/export/shared-notebook`
- `/api/shared-notebooks`
- `/api/shared-notebooks/[id]`
- `/api/share-pack`
- `/api/share-pack/caption`
- `/api/share-pack/checklist`
- `/api/public/offline-seed`

### Admin e automacao operacional
- `/api/admin/import/preview`
- `/api/admin/import/enqueue`
- `/api/admin/import/commit`
- `/api/admin/ingest/run`
- `/api/admin/export/clip`
- `/api/admin/export/thread`
- `/api/admin/export/trail`
- `/api/admin/export/session`
- `/api/cron/weekly-pack`

## Estado do banco e governanca
### Base estrutural
As migrations cobrem o MVP e os incrementos posteriores de ingest, qualidade, evidencias, workflow editorial, analytics, estudo e colaboracao.

### Areas de schema adicionadas ao longo da evolucao
- Core do universo: universes, nodes, edges, documents, chunks, citations, evidences, trails, tutor modules e afins.
- Ingest: logs, jobs, qualidade, imports, vectors, offsets.
- Publicacao e share: highlights de universo, share packs, exports, distribution e catalogo publicado.
- Usuario: profiles, UI settings, user_notes.
- Estudo: `study_sessions`, `study_daily`.
- Colaboracao: `shared_notebooks`, `shared_notebook_members`, `shared_notebook_items`, review queue, audit logs e `meta` para templates.

### Governanca
- RLS forte como padrao.
- Conteudo publico depende de universo publicado.
- Conteudo privado de estudo e colaboracao exige auth e membership/role.
- Share controlado para exports e coletivos, sem promover dados privados por padrao.

## Estado funcional por trilha de produto
### 1. Editorial e curadoria
Estado: forte.
- Ja existe pipeline admin para importar, ingerir, revisar, promover e publicar.
- Checklist operacional ajuda a fechar lacunas antes de publicar.
- Review de evidencias e review coletivo estao encadeados.

### 2. Consumo publico
Estado: forte.
- Hub, mapa, provas, linha, debate e glossario estao navegaveis e integrados por links profundos.
- Share pages existem para itens publicos.

### 3. Estudo individual
Estado: forte.
- Meu Caderno offline-first, highlights reais no Doc Viewer, busca universal, Focus Mode e recap semanal compoem um fluxo consistente.

### 4. Estudo colaborativo
Estado: bom e em expansao.
- Coletivos, review queue, export do coletivo e templates ja operam como acervo editorial compartilhado.
- Ainda nao ha comentarios/chat, o que esta alinhado com a regra de nao virar rede social.

## Templates de coletivos
Implementados em codigo:
- `weekly_base`
- `clipping`
- `study_group`
- `thematic_core`
- `blank`

Capacidades:
- defaults de titulo, slug, summary e visibilidade
- tags sugeridas
- fontes prioritarias (`preferredSources`)
- microcopy de uso
- ordenacao contextual no modal de adicionar ao coletivo
- CTA no share pack para gerar `Base da Semana`

## Exportacao
### Implementado
- Exports existentes de clip, session, thread e trail.
- Export `notebook` para pack de estudo em MD/PDF.
- Export `shared_notebook` para coletivo.

### Guardrails
- Clamp por item.
- Limites de quantidade.
- Share desligado por padrao.
- Visitante prioriza geracao local/offline quando necessario.

## Busca e descoberta
- Command Palette 2.0 com endpoint de busca server-side.
- Busca por universo + Meu Caderno.
- Filtros por tipo.
- Sintaxe `@` e `#`.
- Ranking deterministico com diversidade por tipo.

## Estudo e recap
- `study_sessions` agrega interacoes por universo.
- `study_daily` sustenta streak util, minutos focados e recap.
- Tracker dispara a partir de Focus Mode, Doc Viewer, tutor, trilhas e criacao de notas/highlights.

## Documentacao disponivel
A pasta `docs/` esta ampla e cobre areas centrais:
- arquitetura, DB, API, env, deploy, ops, seguranca
- ingest, qualidade e workflow editorial
- UI, PWA, tutor, notes, offline, study, search
- share, share pack, exports
- colaboracao, review coletivo e templates

Isso reduz bastante o risco de conhecimento tacito preso no codigo.

## Validacao mais recente
### Confirmado nesta rodada
- `npm run verify`: PASSOU
- `npx vitest run tests/shared-notebook-access.test.ts tests/shared-notebook-review.test.ts tests/shared-notebook-templates.test.ts`: PASSOU
- `npm run test:ui:ci`: PASSOU com 1 teste flaky recuperado em retry

### Situacao do e2e nesta rodada
- `npm run test:e2e:ci`: FALHOU por ambiente, nao por regressao funcional confirmada.
- Motivo: `EADDRINUSE` na porta `3100` ao subir o `webServer` do Playwright.
- Leitura correta: o runner esta sensivel a porta ocupada; precisa garantir limpeza do processo anterior ou porta livre antes do disparo.

### Ultimo status funcional conhecido do e2e
- A suite `test:e2e:ci` havia passado anteriormente com `40 passed` apos os ajustes de coletivos/templates.
- Como a execucao desta rodada nao completou, o estado atual seguro e: fluxo funcional previamente verde, runner atualmente bloqueado por porta ocupada.

## Riscos e passivos tecnicos conhecidos
### 1. Warnings recorrentes do Next
- `themeColor` ainda esta em `metadata` e deveria migrar para `viewport`.
- Ha aviso de `allowedDevOrigins` em requests cross-origin locais no dev server.

### 2. Sentry
- Aviso deprecado: migrar `sentry.client.config.ts` para `instrumentation-client.ts`.

### 3. Estabilidade de testes visuais
- O visual CI passou, mas com snapshot desktop flakey em retry.
- Vale revisar diffs recorrentes de mapa/desktop para reduzir ruido.

### 4. Runner de e2e
- `tools/run-e2e-ci.mjs` ainda depende de porta livre consistente.
- Ha risco operacional de falso negativo quando sobra um servidor em `3100`.

### 5. Workspace sujo
- O repositorio tem alteracoes rastreadas e arquivos de log nao commitados.
- Isso nao impede desenvolvimento, mas aumenta ruido de operacao e leitura do estado.

## Estado do workspace no momento do relatorio
### Arquivos modificados rastreados
- incluem areas de admin, export, debate, doc viewer, notebook, status, share, testes e `reports/ESTADO_DA_NACAO.md`.

### Arquivos novos nao rastreados
- novas rotas e componentes de `shared-notebooks`
- docs de colaboracao e templates
- migrations de coletivos/review/templates
- testes de coletivos/templates
- varios logs de verify/e2e/playwright

## Leitura final
O projeto ja deixou de ser apenas um MVP navegavel. Hoje ele opera como uma plataforma editorial-estudo com:
- base de dados estruturada
- operacao admin utilizavel
- consumo publico coerente
- estudo individual robusto
- colaboracao com governanca
- exportacao e share controlado

O proximo ganho real de qualidade nao esta em adicionar mais modulos grandes, e sim em reduzir ruido operacional:
1. estabilizar `test:e2e:ci` contra conflito de porta
2. limpar warnings de metadata do Next
3. migrar setup do Sentry
4. reduzir flakiness visual
5. organizar ou limpar logs transitivos do workspace

## Arquivos de referencia imediata
- `reports/ESTADO_DA_NACAO.md`
- `docs/ARCHITECTURE.md`
- `docs/OPS.md`
- `docs/DB.md`
- `docs/EXPORTS.md`
- `docs/STUDY.md`
- `docs/COLABORACAO.md`
- `docs/COLAB_REVIEW.md`
- `docs/COLAB_TEMPLATES.md`
