# Programa Editorial

O programa editorial organiza varios universos em paralelo sem inventar um workflow novo. Ele reaproveita `editorial_programs`, `editorial_program_items` e `autoAssessUniverseLane` para transformar o board em uma central de operacao editorial.

## Leitura do board

A rota `/admin/programa-editorial` funciona como indice operacional:
- titulo e resumo de cada programa
- numero de universos em operacao
- quantos estao em revisao
- quantos chegaram em concluido
- data de atualizacao e atalhos para abrir o board ou criar lote

A rota `/admin/programa-editorial/[slug]` tem 4 camadas:
1. Hero operacional com metricas da fila e CTAs principais.
2. Barra de saude com contagem por etapa e leitura rapida de gargalo.
3. Board principal com etapas mais legiveis e cards operacionais.
4. Painel lateral com recomendacoes imediatas e proximos movimentos.

## Etapas visiveis do board

Mapeamento entre nome interno e linguagem visivel:
- `bootstrap` -> `Estrutura`
- `ingest` -> `Ingestao`
- `quality` -> `Qualidade`
- `sprint` -> `Curadoria`
- `review` -> `Revisao`
- `highlights` -> `Vitrine`
- `publish` -> `Publicacao`
- `done` -> `Concluido`

## Gargalos e saude

O board premium introduz tres leituras novas:
- `LaneHealthBadge`: mostra rapidamente o peso de cada etapa e destaca a mais congestionada.
- `ProgramBlockerChip`: marca sinais como `Sem docs`, `Ingestao parada`, `Qualidade baixa`, `Muitos drafts`, `Sem highlights` e `Pronto para vitrine`.
- `UniverseOpsCard`: concentra contexto editorial, badges, sinais operacionais e acoes rapidas por universo.

A secao `Saude do board` responde tres perguntas:
- Onde esta travado.
- Qual universo esta com maior atraso.
- Quantos cards estao sem movimento recente.

## Etapa sugerida

`autoAssessUniverseLane` continua sendo a base da sugestao. A UX agora deixa mais claro:
- etapa atual
- etapa sugerida
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
- Inbox documental ou Docs, dependendo da etapa
- Checklist
- Revisao
- Vitrine
- Vitrine editorial
- Share pack quando o universo ja esta publicado

## Como os universos entram no board

- Inbox documental: entra em `ingest` quando nasce com PDFs anexados.
- Modelo editorial: entra em `bootstrap` com estrutura pronta e sem lote inicial.
- Manual avancado: pode nascer em estrutura e ser puxado para o programa quando fizer sentido.

## Qual modo usar

- Lote documental: use `/admin/universes/inbox` quando voce ja tem 3 a 5 PDFs de um mesmo macrotema e quer que a IA sugira estrutura inicial.
- Modelo editorial: use `/admin/universes/new` quando voce quer partir de um formato editorial conhecido, mesmo sem lote documental.
- Manual: use o modo avancado em `/admin/universes` quando voce ja sabe exatamente o universo que quer abrir e nao precisa de assistencia inicial.

## Rotina semanal recomendada

1. Abrir `/admin/programa-editorial` e identificar qual programa concentra mais trabalho.
2. Entrar no board principal e ler a secao `Saude do board`.
3. Atacar primeiro cards sem movimento recente ou presos em `Qualidade` e `Revisao`.
4. Revisar a diferenca entre etapa atual e etapa sugerida.
5. Resolver vitrine editorial e share pack dos universos em `Publicacao`.
6. Fechar a semana com menos itens parados e mais universos empurrados para `Concluido`.
