# Templates de Coletivo

## O que sao
Templates de coletivo aceleram a criacao de cadernos compartilhados sem prender o time a uma estrutura rigida. Eles so preenchem defaults de titulo, resumo, visibilidade, tags sugeridas e tipos prioritarios.

## Templates disponiveis
- `weekly_base`: base semanal para triagem, review e consolidacao editorial.
- `clipping`: monitoramento continuo com recortes, sinais e registros curtos.
- `study_group`: percurso coletivo de leitura, destaque e perguntas.
- `thematic_core`: base tematica para curadoria e promocao editorial.
- `blank`: criacao sem preset, mantendo somente os defaults seguros.

## Quando usar
- Base da semana -> review -> share/editorial.
- Grupo de estudo -> tutor/trilhas -> export.
- Nucleo tematico -> promocao para evidence, glossario, event e node_question.
- Clipping -> monitoramento rapido antes da curadoria.

## Integracoes
- Rota de criacao rapida: `/c/[slug]/coletivos/novo`.
- Share Pack admin pode gerar uma `Base da Semana` a partir da semana corrente.
- `Adicionar ao coletivo` ordena primeiro os coletivos mais compativeis com o `source_type` do item.

## Privacidade e governanca
- Templates nao mudam a governanca existente.
- O default continua seguro: `team` para a maioria dos fluxos.
- Nada vira publico automaticamente.
