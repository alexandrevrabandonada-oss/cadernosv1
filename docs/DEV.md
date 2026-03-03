# Desenvolvimento - Cadernos Vivos

## Requisitos

- Node.js 20+
- npm 10+

## Instalacao

```bash
npm install
```

## Scripts

- `npm run dev`: desenvolvimento local.
- `npm run build`: build de producao.
- `npm run start`: sobe o servidor de producao.
- `npm run lint`: lint com regras do Next.js.
- `npm run typecheck`: validacao de tipos TypeScript.
- `npm run verify`: fluxo completo (`lint` + `typecheck` + `build`).
- `npm run supabase:check`: valida URL e chaves do Supabase via endpoint REST.

## Feature flag de admin

Para habilitar `/admin`, configure no ambiente:

```bash
NEXT_PUBLIC_ADMIN_ENABLED=true
```

Opcionalmente, tambem funciona:

```bash
ADMIN_ENABLED=true
```

## Variaveis de ambiente Supabase

- Copie os placeholders de `.env.example`.
- Defina os valores reais em `.env.local` (arquivo ignorado pelo Git):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Estrutura sugerida para evolucao

- `components/`: design system incremental.
- `lib/`: regras de dominio e adaptadores.
- `tools/`: tarefas repetiveis (seed, validacoes, etc.).
- `reports/`: trilha de auditoria tecnica por entrega.
