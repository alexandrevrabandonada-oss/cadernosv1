# Operacoes: Checklist do Universo

## Objetivo
O checklist em `/admin/universes/[id]/checklist` mostra, em modo operador, se um universo esta pronto para publicacao e onde estao as lacunas.

## Como interpretar status
- `PASS`: criterio atendido.
- `WARN`: criterio parcialmente atendido.
- `FAIL`: lacuna critica.

## Criterios padrao (defaults em codigo)
- Nos totais: `>= 12` (warn `8-11`, fail `<8`)
- Nos core: `>= 5` (warn `3-4`, fail `<3`)
- Docs totais: `>= 10` (warn `5-9`, fail `<5`)
- Docs processados: `>= 5` (warn `2-4`, fail `<2`)
- Docs link-only: `<= 5` (warn `6-10`, fail `>10`)
- Evidencias totais: `>= 15` (warn `8-14`, fail `<8`)
- Cobertura por no core:
  - evidencias por core: fail se `0`, warn se `1`, pass com `>=2`
  - perguntas por core: fail se `0`, warn se `1`, pass com `>=2`
- Ingest pending: `<= 10` (warn `11-30`, fail `>30`)
- Ask insufficient rate (24h): `<= 60%` (warn `61-80%`, fail `>80%`)

Observacao sobre no core:
- heuristica atual: `kind = 'core'` OU tag `core` OU `kind = 'concept'`.

## Fluxo recomendado: "universo em 1 tarde"
1. Importar documentos (`/admin/universes/[id]/docs`).
2. Rodar ingestao e reduzir pendencias.
3. Criar/ajustar nos core (`/admin/universes/[id]/nodes`).
4. Vincular docs aos nos (`/admin/universes/[id]/links`, tab Docs).
5. Vincular evidencias aos nos (tab Evidencias).
6. Curar perguntas por no (tab Perguntas).
7. Revalidar checklist ate `PASS` ou `WARN` aceitavel.
8. Gerar/Regerar "Comece Aqui" (`/admin/universes/[id]`).
9. Validar tutoria do comece-aqui (`/admin/universes/[id]/trilhas`):
   - >=1 passo com evidencia obrigatoria
   - >=1 passo com pergunta guiada
10. Publicar.

## Acoes rapidas
- Checklist aponta links diretos para:
  - `nodes`
  - `docs`
  - `links`
  - `assistido`
  - `admin/status`

## Curadoria assistida
- Use `/admin/universes/[id]/assistido` quando houver lacunas de cobertura.
- Fluxo sugerido:
1. Gerar sugestoes do nucleo.
2. Aplicar docs sugeridos com melhor score.
3. Promover evidencias candidatas e vincular ao no.
4. Adicionar perguntas sugeridas.
5. Voltar ao checklist e confirmar melhora.

## Provas v2 e operacao editorial
- A tela publica `/c/[slug]/provas` agora e **evidence-first**.
- Impacto operacional direto:
  - mais `evidences` curadas = melhor experiencia de Provas
  - filtros por no (`node`) dependem de vinculos `node_evidences`
  - relacionados ficam melhores com curadoria em `node_evidences` e metadados de documento
- Rotina recomendada apos ingestao:
1. Curar os melhores chunks em evidencias.
2. Vincular evidencias aos nos centrais.
3. Revisar Provas por no/tag/ano com links compartilhaveis (`selected` + filtros).

## Fluxo Linha -> Provas (editorial)
- A timeline em `/c/[slug]/linha` deve ser usada para transformar eventos em investigacao evidencial.
- Em cada item da linha:
  - revisar no relacionado e documento associado
  - usar CTA `Ver Provas` para abrir `/provas` ja filtrado por contexto (no/tags/ano/documento)
- Beneficio operacional:
  - encurta o caminho de narrativa temporal para validacao em evidencia curada.

## Trilhas v2 no fluxo editorial
- Depois de checklist PASS:
1. Garantir trilha `comece-aqui` ativa.
2. Validar cards de trilha (titulo, resumo, foco, duracao).
3. Validar modo player com passos navegaveis por URL (`trail`, `step`, `mode=player`).
4. Configurar ramificacoes por no/tag para abrir Provas/Linha/Debate filtrados.
5. Marcar trilhas `Tutor-ready` quando houver pergunta guiada/evidencia obrigatoria.

## Curadoria de Glossario
- Use `/admin/universes/[id]/glossario` para manter o indice conceitual do universo.
- Fluxo recomendado:
1. Rodar `Sugerir termos` para criar rascunhos de nodes/tags/documentos.
2. Revisar termo, slug e definicao curta.
3. Vincular no principal (`node_id`) quando houver.
4. Destacar evidencias-chave e perguntas sugeridas.
5. Validar no publico em `/c/[slug]/glossario` (busca, letra e CTAs).

## Mapa como eixo operacional
- Use `/c/[slug]/mapa` para atacar lacunas por cobertura.
- Fluxo recomendado:
1. Filtrar `coverage=low` para encontrar nos que precisam de curadoria.
2. Abrir detalhe do no e revisar:
   - docs vinculados
   - evidencias vinculadas
   - perguntas sugeridas
3. Navegar pelos portais do detalhe (Provas/Linha/Debate) para fechar lacunas.

### Quando usar clusters no mapa
- Use `view=clusters` quando o universo tiver muitos nos.
- Fluxo recomendado:
1. Entrar em um cluster relevante (`cluster=<tag>`).
2. Revisar top nos no detalhe do cluster.
3. Abrir Provas/Linha/Debate pelos portais contextuais de tag.
4. Voltar ao mapa geral e repetir no proximo cluster prioritario.

## Privacidade e seguranca
- Checklist e restrito a editor/admin.
- Sem PII no painel.
- Dados agregados por universo (24h), sem exposicao publica.

## Universo vitrine: Poluicao em Volta Redonda
- Guia dedicado: [DEMO_POLUICAO_VR.md](/workspace/docs/DEMO_POLUICAO_VR.md)
- Seed idempotente:
```bash
npm run demo:seed
```
- Import em lote de fontes:
```bash
npm run demo:import
```

## Sprint de Curadoria (auto-aplicar sugestoes)
- Rota: `/admin/universes/[id]/sprint`
- Objetivo: fechar cobertura dos nos core com metas por no (docs/evidencias/perguntas).
- Fluxo recomendado:
1. Rodar import + ingest no console demo (`/admin/universes/[id]/demo`).
2. Abrir sprint e executar `dry-run`.
3. Rodar sprint real (`core`) em lotes curtos.
4. Revisar evidencias promovidas em `/c/[slug]/provas?node=<nodeSlug>`.
5. Revalidar checklist e publicar quando os gates estiverem estaveis.

## Fluxo de Vitrine (publish seguro)
- Rota de configuracao: `/admin/universes/[id]/highlights`
- Objetivo: preparar o Hub publico com kit editorial antes de publicar.

### Pipeline recomendado (ordem)
1. Import (`/admin/universes/[id]/demo` ou `/docs`).
2. Ingest (`/admin/universes/[id]/docs` + worker).
3. Qualidade (`/admin/universes/[id]/docs/qualidade`).
4. Sprint (`/admin/universes/[id]/sprint`).
5. Highlights (`/admin/universes/[id]/highlights`).
6. Publish como vitrine (acao protegida).

### Gate de publicacao
- A acao `Publicar como vitrine` roda checklist server-side.
- Se houver FAIL critico:
  - `force=false`: bloqueia publicacao.
  - `force=true` (apenas admin): permite publicar e registra warning em log.
- Se highlights estiverem vazios, o sistema auto-seleciona antes de publicar.
