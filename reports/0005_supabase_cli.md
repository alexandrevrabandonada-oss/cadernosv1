# Supabase CLI Report 0005

Data: 2026-03-03
Escopo: setup de Supabase CLI com migrations versionadas no repositório.

## Entregas

- Estrutura criada:
  - `supabase/config.toml`
  - `supabase/migrations/.gitkeep`

- Scripts npm adicionados em `package.json`:
  - `db:login`
  - `db:link`
  - `db:push`
  - `db:deploy`
  - `db:status`

- Wrapper CLI criado:
  - `tools/supabase-cli.mjs`
  - encapsula comandos Supabase com validacao de env e uso opcional de token/senha.

- Documentacao criada:
  - `docs/DB.md`
  - fluxo completo: criar migration, aplicar em dev, deploy em producao via CI.

- Hardening de segredos:
  - `.gitignore` atualizado para ignorar:
    - `.env` e `.env.*` (com excecao de `.env.example`)
    - `supabase/.temp/`
    - `supabase/.branches/`
    - `supabase/config.local.toml`

## Verificacao

Comando executado:

```bash
npm run verify
```

Resultado:

- `lint`: OK
- `typecheck`: OK
- `build`: OK

Observacao:

- Aviso de deprecacao de `next lint` (nao bloqueante no Next 15.5.12).
