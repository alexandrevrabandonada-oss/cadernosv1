# Programa Editorial

O programa editorial organiza varios universos em paralelo sem criar um workflow novo. Ele reaproveita bootstrap, ingest, quality, sprint, review, highlights e publish.

## Lanes

- `bootstrap`: universo ainda sem docs ou sem estrutura suficiente.
- `ingest`: docs chegaram, mas ainda nao foram processados.
- `quality`: ha processamento, mas a qualidade media ainda esta baixa.
- `sprint`: faltam links editoriais e cobertura minima.
- `review`: existem drafts, fila coletiva ou evidencias pendentes acima do publicado.
- `highlights`: ha base publicada, mas ainda faltam sinais/highlights para leitura publica.
- `publish`: checklist quase pronto, falta decisao de publicacao.
- `done`: universo publicado.

## Operacao recomendada

1. Criar um programa editorial.
2. Abrir um lote de 3 universos por template.
3. Passar por bootstrap.
4. Importar fontes.
5. Rodar quality pass e sprint.
6. Fechar review e highlights.
7. Publicar.
8. Sugerir featured/focus no catalogo.

## O que o board mostra

- lane atual do universo
- lane sugerida por `autoAssessUniverseLane`
- template usado no bootstrap
- resumo curto do checklist
- atalhos para hub, bootstrap, review, checklist, highlights e featured/focus

## Autoavaliacao

`autoAssessUniverseLane` usa sinais simples:

- sem docs: `bootstrap`
- docs enviados, sem processed: `ingest`
- qualidade media baixa: `quality`
- sem links editoriais: `sprint`
- drafts/review acima do publicado: `review`
- publicado internamente sem sinais/highlights: `highlights`
- pronto para publicar: `publish`
- universo publicado: `done`

## Exemplo pratico: lote multiuniverso 2026

O board principal programa-editorial-2026 nasce com tres universos estruturais:

- saude-poluicao-vr (issue_investigation)
- memoria-industrial-vr (	erritorial_memory)
- espira-fundo-monitoramento (campaign_watch)

Todos entram como ootstrap, unpublished, com checklist inicial, Hub funcional e trilha Comece Aqui ativa.

O plano operacional detalhado fica em eports/PLANO_INSUMOS_MULTIUNIVERSO.md.
