# Workflow Editorial de Evidências

## Objetivo
Separar material curado em rascunho do material pronto para publico.

## Estados
- `draft`: evidencia criada por curadoria assistida/sprint/manual, ainda sem revisao final.
- `review`: evidencia em revisao editorial.
- `published`: evidencia aprovada para uso publico.
- `rejected`: evidencia rejeitada para publicacao.

## Regra de exibicao
- Publico: somente `published`.
- Editor/Admin: pode listar `draft`, `review`, `published`, `rejected`.

## Fila de revisao
- Rota: `/admin/universes/[id]/review`
- Acoes rapidas:
1. Aprovar (`published`)
2. Mandar para `review`
3. Voltar para `draft`
4. Rejeitar (`rejected`)
5. Editar titulo/resumo/no relacionado e nota editorial

## Auditoria
- Tabela: `evidence_audit_logs`
- Guarda:
  - acao (`create`, `status_change`, etc.)
  - `from_status` e `to_status`
  - nota opcional
  - usuario e timestamp

## Fluxo recomendado
1. Curadoria assistida/sprint promove trechos para evidencia em `draft`.
2. Revisao humana na fila `/review`.
3. Evidencias `published` entram no publico:
  - Provas
  - Highlights/Share
  - Tutor/Trilhas publicas
4. Rejeicoes ficam auditadas, sem ir para publico.
