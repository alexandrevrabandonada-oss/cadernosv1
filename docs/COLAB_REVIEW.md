# Review de Coletivos

## Fluxo

1. Um highlight/nota nasce no estudo individual.
2. O item e adicionado a um coletivo.
3. O item entra na fila com `review_status='draft'`.
4. Owner/editor move para `review`, `approved` ou `rejected`.
5. Quando fizer sentido, o item e promovido para um objeto editorial do produto.
6. O objeto promovido segue o fluxo editorial proprio e continua privado ate revisao/publicacao do modulo correspondente.

## Promocoes suportadas

- `evidence`: cria evidencia com `status='draft'`.
- `node_question`: cria pergunta editorial ligada a um no.
- `glossary_term`: cria termo no glossario com metadata minima editorial.
- `event`: cria item da linha do tempo com metadados basicos.

## Auditoria

Cada item registra logs em `shared_notebook_audit_logs` com:

- `create`
- `status_change`
- `promote`
- `remove`

Cada log guarda `from_status`, `to_status`, `note`, `changed_by` e `created_at`.

## Privacidade

- Apenas `owner` e `editor` revisam e promovem.
- Visitante nao participa da fila.
- A promocao nao publica nada automaticamente.
- O coletivo serve como inbox editorial, nao como conversa infinita.
