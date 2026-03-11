# Bootstrap de Universo

## Objetivo

Reduzir o atrito para abrir um universo novo com estrutura editorial minima, Hub util e checklist inicial coerente.

## Rotas

- `/admin/universes/new`
- `/admin/universes/[id]/bootstrap`
- `POST /api/admin/universes/bootstrap`

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

1. Criar universo em `/admin/universes/new`.
2. Aplicar template ou clone em `/admin/universes/[id]/bootstrap`.
3. Importar docs.
4. Rodar quality pass/checklist.
5. Fazer sprint editorial.
6. Publicar quando o universo estiver pronto.

## TEST_SEED

Em `TEST_SEED=1`, o bootstrap usa store mock em memoria para que o Hub, o admin e o checklist funcionem mesmo sem `SUPABASE_SERVICE_ROLE_KEY`.

## Exemplo de lote real

O bootstrap multiuniverso de 2026 usa tres templates diferentes para provar o modelo operacional:

- saude-poluicao-vr com issue_investigation
- memoria-industrial-vr com 	erritorial_memory
- espira-fundo-monitoramento com campaign_watch

Todos nascem published=false, eatured=false, ocus_override=false e entram primeiro no board editorial em ootstrap.
