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

## Privacidade e seguranca
- Checklist e restrito a editor/admin.
- Sem PII no painel.
- Dados agregados por universo (24h), sem exposicao publica.
