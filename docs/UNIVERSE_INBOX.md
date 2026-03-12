# Universe Inbox

## O que e

A Universe Inbox e a sala premium de ingest editorial do admin. Ela transforma um lote de PDFs de um mesmo macrotema em um universo rascunhado, com leitura inicial assistida por IA, bootstrap sugerido e entrada imediata no pipeline editorial.

Rota principal:
- `/admin/universes/inbox`

## Quando usar este modo

Use Inbox quando:
- voce ja tem um lote documental em PDF
- o recorte ainda nao esta totalmente nomeado
- faz sentido deixar a IA sugerir tema, titulo, slug e bootstrap inicial
- voce quer sair da importacao direto para o board editorial com mais confianca

## Fluxo visual

1. Soltar PDFs.
2. Revisar o lote recebido antes da analise.
3. Ler a analise inicial do tema.
4. Revisar as sugestoes da IA.
5. Confirmar a criacao do universo.
6. Abrir board, checklist, hub preview ou docs importados.

## O que aparece em cada etapa

### 1. Dropzone
- aceita drag-and-drop e botao `Selecionar arquivos`
- mostra estados de vazio, arrastando, processando e lote pronto
- reforca limites e guardrails sem parecer um upload tecnico antigo

### 2. Lote recebido
- lista nome e tamanho dos PDFs
- mostra status de aguardando analise antes do envio
- permite remover itens destoantes antes da leitura inicial
- depois da analise, passa a mostrar titulo extraido e preview textual quando houver

### 3. Leitura inicial do tema
A IA organiza a leitura em blocos:
- `Tema principal`
- `Sinais detectados`
- `Estrutura sugerida`
- `Alertas`

A analise atual combina:
- nome do arquivo
- texto extraido do PDF
- palavras recorrentes do lote
- sinais de OCR fraco
- mistura tematica entre subgrupos do batch

## O que a IA sugere

A IA sugere apenas estrutura editorial inicial:
- titulo
- slug
- resumo
- template de bootstrap
- nos core
- glossario inicial
- perguntas de partida
- tags e trilha inicial
- proxima lane esperada no board

Os niveis de confianca aparecem como:
- `Forte`
- `Media`
- `Fraca`

## O que continua humano

- confirmar titulo, slug e resumo
- trocar o template sugerido quando necessario
- decidir se o lote vai para ingest agora ou se cria so a estrutura
- separar lotes heterogeneos em universos diferentes
- revisar PDFs com OCR ruim ou texto insuficiente
- decidir o que vira evidencia publica depois

## Alertas e como ler

Os alertas mais comuns sao:
- lote muito heterogeneo
- texto ruim ou OCR fraco
- poucos sinais em comum
- titulo muito generico
- template incerto

Leitura pratica:
- se o lote estiver coeso e a confianca estiver forte, normalmente vale seguir com o template sugerido
- se a confianca estiver media, revise titulo, slug e template com mais cuidado
- se a confianca estiver fraca, considere seguir com `blank_minimal` ou separar o lote

## Quando separar o lote em 2 universos

Considere separar quando:
- dois subtemas aparecem com peso parecido
- os arquivos parecem pertencer a frentes editoriais diferentes
- a lista de alertas aponta mistura tematica e poucos sinais em comum
- a melhor leitura do lote nao cabe em um unico titulo claro

O botao `Separar lote` orienta a decisao, mas a divisao final continua humana.

## Guardrails

- nenhum universo nasce publicado
- nenhuma evidencia e promovida para o publico automaticamente
- se o lote parecer heterogeneo, a inbox avisa e sugere separar
- se houver poucos sinais tematicos comuns, a sugestao cai para `blank_minimal`
- o board recebe o universo em `ingest` quando ha PDFs anexados e em `bootstrap` quando nasce so a estrutura

## Comparacao rapida de modos

- Inbox: melhor para lote documental real
- Template: melhor quando o recorte editorial ja esta claro, mas a base ainda nao existe
- Manual: melhor quando voce ja sabe exatamente o universo que quer abrir e nao precisa de assistencia

## Limites do clustering

- V1 assume um macrotema por lote
- o clustering e heuristico, nao classificacao definitiva
- PDFs com OCR ruim dependem mais do nome do arquivo do que do corpo textual
- o botao de separar lote orienta o editor; a divisao final continua sendo uma decisao humana
