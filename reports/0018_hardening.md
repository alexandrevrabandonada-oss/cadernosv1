# Hardening Report 0018

Data: 2026-03-03  
Escopo: endurecimento do `/api/ask`, logs seguros, pagina `/status` e ajustes finais de a11y/performance.

## Entregas

- `/api/ask` com modo estrito:
  - regra aplicada: sem citacao => sem conclusao.
  - quando evidencia for insuficiente, resposta retorna aviso e sugestoes.
  - persistencia de `qa_threads` e `citations` mantida.
  - log operacional em `qa_logs` para `ok`, `invalid_payload`, `rate_limited`, `error`.

- Logs leves sem dados sensiveis:
  - `qa_logs`: sem pergunta/resposta, apenas metadados (tamanho da pergunta, qtd de citacoes, latencia, hash do requester).
  - `ingest_logs`: sanitizacao de `details` para campos seguros (`reason`, contagens), removendo mensagens brutas de erro.

- Nova pagina `/status`:
  - checklist de envs (apenas presence check, sem expor valores).
  - status de DB e Storage (`cv-docs`).
  - contagens de `universes`, `documents`, `chunks`.
  - timestamp de atualizacao.

- A11y/performance:
  - `DebatePanel` com `label/htmlFor`, `required/minLength/maxLength`, `aria-describedby`, `aria-busy`, `role="alert"` e `aria-live`.
  - `Card` atualizado para aceitar atributos semanticos/ARIA.
  - `/status` usa `Suspense` para melhor feedback de carregamento.

## Arquivos principais alterados

- `app/api/ask/route.ts`
- `lib/ingest/process.ts`
- `lib/status/health.ts`
- `app/status/page.tsx`
- `components/debate/DebatePanel.tsx`
- `components/ui/Card.tsx`
- `components/Header.tsx`
- `app/globals.css`
- `supabase/migrations/20260304024500_qa_logs_hardening.sql`

## Verificacao

Comando executado:

```bash
npm run verify
```

Resultado:

- lint: OK
- typecheck: OK
- build: OK

Observacao:

- apareceu aviso de deprecacao de `next lint` (nao bloqueante).

## Como testar manualmente

1. Suba o app com `npm run dev`.
2. Abra `/status` e confira os checks de env/db/storage + contagens.
3. Em `/c/universo-mvp/debate`, envie pergunta curta (< 8 chars) para validar erro de payload no client.
4. Envie pergunta valida com baixa evidenca e confirme resposta sem conclusao.
5. Envie pergunta com evidencias e confirme retorno com bloco de citacoes.
6. Opcional: consulte tabelas `qa_logs` e `ingest_logs` para confirmar ausencia de dados sensiveis.
