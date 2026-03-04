# Curadoria Assistida

## Objetivo
- Reduzir trabalho manual de curadoria no admin com sugestões determinísticas (sem LLM obrigatório).
- Acelerar cobertura de nós core em `docs`, `evidencias` e `perguntas`.

## Onde usar
- Rota: `/admin/universes/[id]/assistido`
- Pré-requisito: usuário com papel `editor` ou `admin`.

## O que o painel faz
- Sugestões `DOC ↔ NÓ`:
  - Score por sinais leves: match de título, overlap de termos, chunks relevantes e qualidade do documento.
- Sugestões de evidências candidatas:
  - Top trechos (`chunks`) por nó com snippet curto, score e páginas.
  - Botão “Promover para Evidence + Vincular” cria/atualiza `evidences` e vincula em `node_evidences`.
- Sugestões de perguntas:
  - Templates determinísticos por nó para popular `node_questions`.

## Fluxo recomendado
1. Abrir `/admin/universes/[id]/assistido`.
2. Clicar em “Gerar sugestões (núcleo)”.
3. Escolher um nó core na coluna esquerda.
4. Aplicar:
   - 1-3 docs sugeridos com melhor score;
   - 2-3 evidências candidatas relevantes;
   - 2+ perguntas sugeridas.
5. Voltar ao checklist e confirmar melhoria de cobertura.

## Como interpretar score/reasons
- `score` é heurístico `0..1000` (quanto maior, melhor candidato).
- `reasons` (docs) explicam por que apareceu, por exemplo:
  - `title_match`
  - `keyword_overlap`
  - `top_chunks`
- Documento com `text_quality_score` baixo é penalizado nas sugestões.

## Boas práticas
- Sempre revisar antes de promover evidência.
- Priorizar documentos `processed` e com score de qualidade melhor.
- Em PDFs ruins, reprocessar com preset em `/admin/universes/[id]/docs/qualidade` antes da curadoria.

