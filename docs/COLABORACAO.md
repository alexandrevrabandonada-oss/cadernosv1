# Colaboracao

## O que e um coletivo

`/c/[slug]/coletivos` e a camada de triagem colaborativa do produto. O coletivo recebe highlights, notas e referencias vindas do estudo individual, mas nao publica nada sozinho e nao substitui o workflow editorial do universo.

## Visibilidade

- `private`: apenas membros enxergam.
- `team`: apenas membros enxergam, pensado para espacos de estudo internos.
- `public`: abre para visitantes somente se o universo estiver publicado.

## Papeis

- `owner`: cria, edita, revisa, promove e gerencia membros.
- `editor`: adiciona itens, revisa, promove e remove itens.
- `viewer`: apenas leitura no espaco em que participa.

## Fluxo recomendado

1. Estudo individual no Meu Caderno, Provas, Doc Viewer ou Tutor.
2. Promocao manual de um item via `Adicionar ao coletivo`.
3. Curadoria curta no coletivo com nota compartilhada e tags extras.
4. Fila de review em `/c/[slug]/coletivos/[id]/review`.
5. Promocao para objeto editorial (`evidence`, `node_question`, `glossary_term`, `event`).
6. O objeto promovido entra no workflow editorial proprio; nada vai direto para publico.

## Fila de revisao coletiva

Cada item do coletivo passa por um estado editorial:

- `draft`
- `review`
- `approved`
- `rejected`

A fila registra:

- quem revisou
- quando revisou
- nota editorial
- promocao realizada (quando houver)
- trilha de auditoria por item

## Privacidade

- Visitante nao cria nem edita coletivos.
- Highlights/notas privadas continuam privadas ate uma promocao explicita para um coletivo.
- Share pages continuam dependentes de `exports.is_public = true` e universo publicado.
- O coletivo continua sendo um espaco de triagem editorial, nao um chat ou feed social.

## Templates de coletivo
- Criacao rapida em `/c/[slug]/coletivos/novo` com `Base da semana`, `Clipping`, `Grupo de estudo`, `Nucleo tematico` e opcao `Em branco`.
- O template so sugere estrutura inicial: titulo, resumo, visibilidade, tags e tipos prioritarios.
- `Adicionar ao coletivo` passa a priorizar coletivos compativeis com o tipo do item.
- Share Pack admin pode abrir um novo coletivo usando o template `weekly_base`.
