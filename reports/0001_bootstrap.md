# Bootstrap Report 0001

Data: 2026-03-03
Projeto: `cadernos-vivos` (Next.js App Router + TypeScript)

## O que foi criado

- Estrutura base: `app/`, `components/`, `lib/`, `styles/`, `docs/`, `tools/`, `reports/`.
- Rotas publicas com placeholders e navegacao:
  - `/`
  - `/c/[slug]`
  - `/c/[slug]/mapa`
  - `/c/[slug]/provas`
  - `/c/[slug]/linha`
  - `/c/[slug]/trilhas`
  - `/c/[slug]/debate`
  - `/c/[slug]/tutoria`
  - `/admin` (feature flag via `NEXT_PUBLIC_ADMIN_ENABLED` ou `ADMIN_ENABLED`)
- Layout global com header fixo e `QuickNav` dentro do escopo `/c/[slug]`.
- Tema visual inicial "Concreto Zen" via tokens CSS em `styles/tokens.css`.
- Configuracoes de projeto:
  - TypeScript
  - ESLint
  - Prettier
  - scripts `dev`, `build`, `start`, `lint`, `typecheck`, `verify`
- Documentacao:
  - `docs/ARCHITECTURE.md`
  - `docs/DEV.md`

## Verificacao executada

Comando executado:

```bash
npm run verify
```

Resultado:

- `lint`: OK
- `typecheck`: OK
- `build`: OK

Observacao:

- O Next.js 15.5.12 exibiu aviso de deprecacao do `next lint` (nao bloqueante).

## Como testar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Rodar em desenvolvimento:

```bash
npm run dev
```

3. Abrir no navegador:

- `http://localhost:3000/`
- `http://localhost:3000/c/exemplo`
- `http://localhost:3000/c/exemplo/mapa` (e demais secoes)
- `http://localhost:3000/admin`

4. Para habilitar admin, definir:

```bash
NEXT_PUBLIC_ADMIN_ENABLED=true
```