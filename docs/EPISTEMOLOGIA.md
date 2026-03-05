# Epistemologia no Cadernos Vivos

## O que e confidence

`confidence` e uma heuristica editorial de sustentacao da resposta no acervo atual.

Nao mede "verdade absoluta". Mede forca relativa dos sinais disponiveis no momento da consulta.

Campos:
- `confidence_score` (0..100)
- `confidence_label` (`forte|media|fraca`)
- `limitations[]`

## O que NAO e confidence

- Nao substitui revisao humana.
- Nao equivale a prova causal.
- Nao representa consenso cientifico global.
- Nao permite linguagem automatica de "comprovado".

## Como o score e calculado (alto nivel)

Entradas principais:
- diversidade de documentos citados
- quantidade de citacoes
- qualidade documental media (`text_quality_score`)
- concentracao de citacoes em um unico doc (penalidade)
- modo estrito (`insufficient` penaliza e limita score)

Saida:
- `forte` quando score alto
- `media` quando score intermediario
- `fraca` quando score baixo

## Como divergencia e detectada

`divergence_flag` sobe quando existem sinais minimos de conflito/inconclusao em documentos distintos.

Heuristica v1:
- busca marcadores textuais de afirmacao versus negacao/inconclusao;
- exige ao menos 2 documentos distintos;
- evita falso positivo (quando duvida, nao marca).

`divergence_summary` descreve de forma curta e nao alarmista.

## Limitacoes da heuristica

- Dependente da cobertura do acervo e da qualidade dos PDFs.
- Sensivel a linguagem dos trechos (marcadores textuais simples).
- Pode ter falso negativo em casos sem marcadores explicitos.

Por isso a interface sempre exibe:
- citacoes rastreaveis,
- limitacoes,
- e, quando aplicavel, aviso de divergencia.
