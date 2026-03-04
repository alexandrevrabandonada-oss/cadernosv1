# Curatoria Editorial de Nos

## Conceito
O grafo editorial explicito conecta:
- `node_documents`: quais documentos sustentam cada no.
- `node_evidences`: quais evidencias curadas sao centrais para o no.
- `node_questions`: perguntas sugeridas para orientar leitura/debate do no.

Isso reduz dependencia de heuristica e melhora consistencia em Mapa, Provas e Ask.

## Como curar um no (fluxo recomendado)
1. Abrir `/admin/universes/[id]/links`.
2. Selecionar um no na coluna esquerda.
3. Na tab `Docs`, vincular 3-5 documentos com `weight`:
   - 200-1000: documento prioritario.
   - 80-199: apoio.
   - 0-79: contexto periferico.
4. Na tab `Evidencias`, vincular 2-5 evidencias com `pin_rank`:
   - menor `pin_rank` aparece primeiro.
5. Na tab `Perguntas`, adicionar 2-4 perguntas guiadas para o Debate.

## Campos e uso pratico
- `weight` (`node_documents`): relevancia documental para boost de retrieval.
- `pin_rank` (`node_evidences`, `node_questions`): ordenacao editorial.
- `note` (`node_documents`): justificativa curta de curadoria.

## Efeito no produto
- Hub: nos do nucleo exibem contagem de docs/evidencias vinculados.
- Mapa: painel lateral prioriza docs/evidencias vinculados (fallback heuristico se vazio).
- Provas: filtro por no usa `node_evidences` como fonte principal.
- `/api/ask`: com `nodeSlug`, chunks de documentos vinculados recebem boost opcional.

## Boas praticas
- Evite sobrecarregar um no com muitos docs; prefira curadoria enxuta.
- Priorize evidencias com pagina/trecho claro para rastreabilidade.
- Revise `weight/pin_rank` periodicamente conforme nova base documental.

## Glossario como porta de entrada
- O glossario em `/c/[slug]/glossario` conecta termos a no/provas/debate/linha.
- Curadoria minima por termo:
1. Definicao curta clara (`short_def`).
2. Vinculo com `node_id` quando aplicavel.
3. 1-3 evidencias destacadas (`evidence_ids`).
4. 2-4 perguntas sugeridas (`question_prompts`) para abrir Debate.
- Regra editorial:
  - termo deve facilitar navegacao, nao duplicar paginas de evidencia.
