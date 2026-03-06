# Study Sessions e Recap

## O que coletamos
- Apenas metadados de estudo por universo.
- Inicio/fim de sessao, duracao estimada e minutos em foco.
- Itens tocados por tipo e id (`doc`, `evidence`, `thread`, `event`, `trail`, `tutor`).
- Contagens agregadas de acoes como `doc_open`, `highlight_created`, `note_created` e `tutor_ask`.

## O que nao coletamos
- Texto de perguntas e respostas do tutor para o tracker.
- Texto completo de selecoes no Doc Viewer dentro de `study_sessions`.
- Qualquer ranking competitivo entre usuarios.

## Persistencia
- Visitante: localStorage por universo.
- Logado: `public.study_sessions` e `public.study_daily` com RLS owner-only.
- O highlight/nota em si continua em `user_notes`; o tracker guarda so referencias e contagens.

## Onde o tracker dispara
- Entrar em Focus Mode.
- Abrir Doc Viewer.
- Abrir evidencia/thread/event selecionados.
- Abrir e concluir passo de trilha.
- Abrir ponto do tutor e perguntar ao tutor.
- Salvar highlight ou nota no Meu Caderno.

## Recap e streak util
- `/c/[slug]/meu-caderno/recap` mostra Hoje, Semana e Ultimas sessoes.
- O streak e expresso como dias ativos recentes, nao como placar.
- `Continuar no ponto X` usa o ultimo item tocado com link de retorno, e cai para `last_section` quando necessario.
- As recomendacoes `Proximas portas` sugerem 2 nos e 3 evidencias publicadas de forma deterministica.

## Privacidade
- Study Sessions nao entram em share pages.
- O recap e privado do proprio usuario ou local ao visitante.
- Highlights de documento so aparecem em export notebook quando o proprio usuario exporta o proprio caderno.
