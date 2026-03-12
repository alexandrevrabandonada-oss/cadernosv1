# Programa Editorial

O programa editorial organiza varios universos em paralelo sem inventar um workflow novo. Ele reaproveita `editorial_programs`, `editorial_program_items` e `autoAssessUniverseLane` para transformar o board em uma central de operacao editorial.

## Leitura do board

A rota `/admin/programa-editorial` virou um indice operacional:
- titulo e resumo de cada programa
- numero de universos em operacao
- quantos estao em `review`
- quantos chegaram em `done`
- data de atualizacao e atalhos para abrir o board ou criar lote

A rota `/admin/programa-editorial/[slug]` passou a ter 4 camadas:
1. Hero operacional com metricas de fila e CTAs principais.
2. Barra de saude com counts por lane e leitura rapida de gargalo.
3. Board principal com lanes mais legiveis e cards operacionais.
4. Painel lateral com recomendacoes imediatas e proximos movimentos.

## Lanes

- `bootstrap`: ainda em estrutura, sem base suficiente para sair do zero.
- `ingest`: docs entraram, mas ainda nao viraram base processada.
- `quality`: existe processamento, mas a qualidade media ainda esta baixa.
- `sprint`: a base existe, mas falta ligar docs, nos e cobertura editorial.
- `review`: ha drafts, pendencias humanas ou revisao insuficiente.
- `highlights`: ja existe base publicada, mas falta virar leitura forte.
- `publish`: pronto para vitrine, faltando decisao editorial final.
- `done`: universo consolidado e fora da fila principal.

## Gargalos e saude

O board premium introduz tres leituras novas:
- `LaneHealthBadge`: mostra rapidamente o peso de cada lane e destaca a mais congestionada.
- `ProgramBlockerChip`: marca sinais como `Sem docs`, `Ingest parado`, `Quality baixa`, `Muitos drafts`, `Sem highlights` e `Pronto para vitrine`.
- `UniverseOpsCard`: concentra contexto editorial, badges, sinais operacionais e acoes rapidas por universo.

A secao `Saude do board` responde tres perguntas:
- Onde esta travado: qual lane concentra mais cards.
- Maior atraso: qual universo esta ha mais tempo sem movimento.
- Sem movimento recente: quantos cards precisam de reativacao.

## Lane sugerida

`autoAssessUniverseLane` continua sendo a base da sugestao. A UX agora deixa mais claro:
- lane atual
- lane sugerida
- motivo da sugestao

Exemplos de motivo:
- docs importados, mas ainda sem processamento concluido
- ha docs processed, mas a qualidade media ainda esta baixa
- muitos drafts e pouca revisao
- ja tem published + highlights, pronto para vitrine

Cada card pode:
- `Mover agora`
- `Ignorar sugestao`

## Acoes rapidas por universo

Cada card do board pode abrir rapidamente:
- Hub preview
- Inbox ou Docs, dependendo da etapa
- Checklist
- Review
- Highlights
- Featured/Focus
- Share pack quando o universo ja esta publicado

## Como os universos entram no board

- Inbox-first: entra em `ingest` quando nasce com PDFs anexados.
- Template-first: entra em `bootstrap` com estrutura pronta e sem lote inicial.
- Manual avancado: pode nascer em estrutura e ser puxado para o programa quando fizer sentido.

## Qual modo usar

- Lote documental: use `/admin/universes/inbox` quando voce ja tem 3 a 5 PDFs de um mesmo macrotema e quer que a IA sugira estrutura inicial.
- Template: use `/admin/universes/new` quando voce quer partir de um formato editorial conhecido, mesmo sem lote documental.
- Manual: use o modo avancado em `/admin/universes` quando voce ja sabe exatamente o universo que quer abrir e nao precisa de assistencia inicial.

## Rotina semanal recomendada

1. Abrir `/admin/programa-editorial` e identificar qual programa concentra mais trabalho.
2. Entrar no board principal e ler a secao `Saude do board`.
3. Atacar primeiro cards sem movimento recente ou presos em `quality` e `review`.
4. Revisar diferenca entre lane atual e lane sugerida.
5. Resolver highlights, featured/focus e share pack dos universos em `publish`.
6. Fechar a semana com menos itens parados e mais universos empurrados para `done`.

## Universe Inbox

A rota `/admin/universes/inbox` continua sendo a porta principal para lotes documentais.

Fluxo resumido:
- dropzone de PDFs
- leitura inicial do lote
- revisao editorial das sugestoes
- criacao do universo
- entrada automatica em `ingest` ou `bootstrap` no board
