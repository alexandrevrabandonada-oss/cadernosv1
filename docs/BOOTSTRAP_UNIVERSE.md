# Bootstrap de Universo

## Objetivo

Reduzir o atrito para abrir um universo novo com estrutura editorial minima, Hub util e checklist inicial coerente.

## Rotas

- `/admin/universes`
- `/admin/universes/new`
- `/admin/universes/[id]/bootstrap`
- `POST /api/admin/universes/bootstrap`

## Qual modo usar

- Inbox-first: quando o ponto de partida e um lote de PDFs e faz sentido deixar a IA sugerir o bootstrap.
- Template-first: quando o recorte ja esta claro e voce quer nascer com estrutura editorial pronta.
- Manual avancado: quando voce ja sabe exatamente o universo que quer abrir e nao precisa de lote nem wizard protagonista.

## Templates disponiveis

- `blank_minimal`: estrutura minima, pergunta central e percurso inicial curto.
- `issue_investigation`: contexto, atores, impactos, evidencias, marcos, disputas e respostas.
- `territorial_memory`: territorio, marcos historicos, atores locais, memorias e conflitos.
- `campaign_watch`: sinais, agenda, debates e clipping base.

## Quando usar template

Use template quando o universo ainda nao tem uma base operacional pronta e voce quer nascer com:
- nos core
- glossario base
- perguntas iniciais
- trilhas base
- templates de coletivos
- defaults editoriais seguros

## Quando usar clone

Use clone quando ja existe um universo com estrutura editorial valida e voce quer reaproveitar o esqueleto sem herdar o conteudo sensivel.

## O que o clone copia

- nos
- glossario
- trilhas
- perguntas de no
- templates de coletivos
- featured/focus defaults, apenas se marcado

## O que nunca e copiado

- evidences
- documents
- events por padrao
- exports
- analytics
- user_notes
- shared_notebooks reais
- study_sessions

## Fluxo recomendado

1. Escolher a porta certa em `/admin/universes`.
2. Se for template, abrir `/admin/universes/new`.
3. Aplicar template ou clone em `/admin/universes/[id]/bootstrap` quando necessario.
4. Importar docs ou seguir para Inbox/board.
5. Rodar quality pass/checklist.
6. Fazer sprint editorial.
7. Publicar quando o universo estiver pronto.

## TEST_SEED

Em `TEST_SEED=1`, o bootstrap usa store mock em memoria para que o Hub, o admin e o checklist funcionem mesmo sem `SUPABASE_SERVICE_ROLE_KEY`.

## Universe Inbox assistida

Quando o material inicial ja existe em PDF, use `/admin/universes/inbox` em vez de criar tudo manualmente.

Fluxo recomendado:
1. subir lote de PDFs do mesmo macrotema
2. revisar titulo, slug, resumo e template sugeridos
3. criar universo com ou sem ingest imediata
4. abrir checklist/docs/board e seguir o pipeline normal
