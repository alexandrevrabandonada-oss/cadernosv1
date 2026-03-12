# Universe Inbox

## O que e

A Universe Inbox e a rota admin para transformar um lote de PDFs de um mesmo macrotema em um universo rascunhado, com bootstrap inicial sugerido e entrada imediata no board editorial.

Rota principal:

- `/admin/universes/inbox`

## Fluxo

1. Arrastar 3 a 8 PDFs para a dropzone.
2. A inbox sobe os arquivos, cria registros temporarios de import e mostra nome, tamanho, status e titulo extraido quando houver.
3. A analise assistida sugere titulo, slug, resumo, template, tags, subtemas, nos core, glossario, perguntas e trilha `Comece Aqui`.
4. O editor revisa tudo e escolhe entre criar com ingest, criar sem ingest ou separar o lote em dois batches quando houver mistura.
5. O app cria o universo, registra os docs e coloca o card no board editorial principal.

## O que a IA sugere

A analise atual combina:

- nome do arquivo
- texto extraido do PDF
- palavras recorrentes do lote
- sinais de OCR fraco
- mistura tematica entre subgrupos do batch

A IA sugere apenas estrutura editorial inicial:

- titulo
- slug
- resumo
- template de bootstrap
- nos core
- glossario inicial
- perguntas de partida
- tags e trilha inicial

## O que continua humano

- confirmar titulo, slug e resumo
- trocar o template sugerido quando necessario
- decidir se o lote vai para ingest agora ou depois
- separar lotes heterogeneos em universos diferentes
- revisar PDFs com OCR ruim ou texto insuficiente
- decidir o que vira evidencia publica depois

## Guardrails

- nenhum universo nasce publicado
- nenhuma evidencia e promovida para o publico automaticamente
- se o lote parecer heterogeneo, a inbox avisa e sugere separar
- se houver poucos sinais tematicos comuns, a sugestao cai para `blank_minimal`
- o board recebe o universo em `ingest` quando ha PDFs anexados e em `bootstrap` quando nasce so a estrutura

## Limites do clustering

- V1 assume um macrotema por lote
- o clustering e heuristico, nao classificacao definitiva
- PDFs com OCR ruim dependem mais do nome do arquivo do que do corpo textual
- o botao de separar lote orienta o editor; a divisao final continua sendo uma decisao humana
