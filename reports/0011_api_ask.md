# API Ask Report 0011

Data: 2026-03-03
Escopo: endpoint `/api/ask` com busca semântica/fallback, resposta com citações e persistência.

## Endpoint

- Rota criada:
  - `app/api/ask/route.ts`
- Metodo:
  - `POST /api/ask`
- Input:
  - `{ universeSlug, question }`
- Output:
  - `{ answer, citations[] }`

## Fluxo implementado

1. Valida payload (`universeSlug` e `question` com limites de tamanho).
2. Rate limit simples in-memory por IP.
3. Resolve `universe_id` por `universeSlug`.
4. Busca chunks top-k:
   - semântica (`semanticSearchChunks`)
   - fallback textual (já embutido no serviço de busca)
5. Monta resposta estrita:
   - baixa evidência:
     - `"não encontrei evidência suficiente na base enviada"` + sugestões de nós/termos
   - com evidência:
     - síntese cautelosa + citações estruturadas
6. Persiste:
   - `qa_threads` (`question`, `answer`, `universe_id`)
   - `citations` ligadas ao thread

## Segurança

- Nenhum segredo exposto no client.
- Persistência usa apenas `getSupabaseServiceRoleClient()` no servidor.
- Rate limit por IP:
  - janela: 60s
  - limite: 20 req/IP

## Observações de resposta

- Citações retornadas no formato:
  - `doc`, `year`, `pages`, `quote`
- Quando insuficiente:
  - sugere termos com base em nós do universo.

## Verificação

Comando executado:

```bash
npm run verify
```

Resultado:

- `lint`: OK
- `typecheck`: OK
- `build`: OK

Observação:

- Aviso de depreciação de `next lint` no Next 15.5.12 (não bloqueante).
