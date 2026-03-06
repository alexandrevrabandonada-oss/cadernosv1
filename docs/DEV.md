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

## Teste de publish/unpublish

1. Entre em `/admin/universes/[id]` com perfil `editor` ou `admin`.
2. Clique em `Publicar`.
3. Abra uma janela anonima e acesse `/` e `/c/[slug]`:
   - o universo deve aparecer no catalogo e abrir normalmente.
4. Volte no admin e clique em `Despublicar`.
5. Em janela anonima:
   - `/` nao deve listar o universo.
   - `/c/[slug]` deve retornar bloqueio sanitizado (404).
6. Logado como `editor/admin`, `/c/[slug]` continua acessivel em preview.

## Atalhos de teclado (UI-10)

- Disponiveis apenas em desktop (`>= 1024px`) nas rotas `/c/[slug]/*`.
- Abrir palette:
  - `/`
  - `Ctrl/Cmd + K`
- Navegacao rapida (`g` + tecla em ate 700ms):
  - `g m` mapa
  - `g p` provas
  - `g l` linha
  - `g d` debate
  - `g g` glossario
  - `g t` trilhas
  - `g u` tutor
- `Esc`:
  - fecha command palette
  - fecha drawer/detail do workspace quando aberto

### Desativar atalhos em dev (temporario)

- Opcao simples: testar em viewport mobile (`< 1024px`) para atalhos nao dispararem.
- Para desligar via codigo local, comente o componente `CommandPalette` em `app/c/[slug]/layout.tsx`.

## Hardening operacional (OPS-01)

### Runner E2E/UI mais resiliente
- `npm run test:e2e:ci` e `npm run test:ui:ci` agora resolvem porta livre antes de iniciar o Playwright.
- A porta preferida continua `3100`, mas o runner cai automaticamente para outra livre quando necessario.
- O log do runner informa claramente quando houve fallback.
- O `webServer` do Playwright sobe com `127.0.0.1` e porta explicita para evitar conflitos e warnings cruzados.

### Limpeza de artefatos temporarios
- Use `npm run clean:ops` para remover:
  - `test-results/`
  - `playwright-report/`
  - `*.tsbuildinfo`
  - logs temporarios de verify/e2e/playwright
- O script foi pensado para limpar apenas artefatos seguros, sem tocar em `docs/` ou `reports/`.

### Snapshot mode previsivel
- `npm run test:ui:ci` agora força `UI_SNAPSHOT=1` e `NEXT_PUBLIC_UI_SNAPSHOT=1`.
- Isso desliga motion e reduz variacao visual durante as capturas.
