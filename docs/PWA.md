# PWA — Cadernos Vivos

## Escopo

Implementacao PWA basica com foco em:
- install prompt
- app shell em cache
- fallback offline amigavel

Sem cache agressivo de dados sensiveis e sem prometer uso 100% offline.

## Manifest

- Arquivo: `app/manifest.ts`
- Itens principais:
  - `name`: Cadernos Vivos
  - `short_name`: Cadernos
  - `display`: standalone
  - `theme_color` e `background_color` alinhados ao tema Concreto Zen
  - icones:
    - `icon-192.png`
    - `icon-512.png`
    - `icon-maskable-192.png`
    - `icon-maskable-512.png`

## Metadados mobile

- Arquivo: `app/layout.tsx`
- Inclui:
  - `themeColor`
  - `appleWebApp.capable`
  - `appleWebApp.statusBarStyle`
  - `viewportFit: 'cover'`
  - `apple-touch-icon`

## Install prompt

- Componente: `components/pwa/InstallPrompt.tsx`
- Comportamento:
  - Android/Chromium: usa `beforeinstallprompt`
  - iOS/Safari: mostra instrucoes “Adicionar a Tela de Inicio”
  - dismiss persistido por 14 dias (`localStorage`)
- Presenca:
  - Header (desktop)
  - DockNav (mobile)

## Service Worker

- Arquivo: `public/sw.js`
- Registro:
  - `components/pwa/ServiceWorkerRegister.tsx`
  - ativo apenas em `NODE_ENV=production`

### Estrategia de cache (VIZ-10)

- App shell/assets: `cache-first`
  - `/`
  - `/offline`
  - `/icons/*`
  - `/favicon.svg`
  - `/_next/static/*`
- Paginas publicas:
  - Home e Hub (`/`, `/c/[slug]`): `stale-while-revalidate`
  - Share pages (`/c/[slug]/s/*`): `cache-first` com TTL 24h
  - Salas do universo (`/c/[slug]/provas|linha|debate|mapa|glossario|trilhas|tutor`):
    `network-first` com fallback de cache (TTL curto, 6h)
- OG:
  - `/api/og`: `cache-first` com TTL 24h
- Limite de cache:
  - poda por quantidade de entradas (FIFO por `sw-cached-at`)

### Rotas excluidas do cache

- `/admin/*`
- `/api/admin/*`
- `/api/auth/*`
- `/login`
- rotas privadas de estudo:
  - `/c/[slug]/tutor/s/*`
  - `/c/[slug]/exports/*`
- qualquer request `POST`

## Offline seed publico

- Endpoint: `GET /api/public/offline-seed`
- Retorno:
  - `universeSlugs`: universos publicados para precache de hub/vitrine
  - `sharePages`: top share pages recentes (analytics 24h) ou fallback de highlights
  - `updatedAt`
- Uso:
  - no `install/activate`, o SW precacheia URLs-chave de vitrine/share.

## Banner offline

- Componente: `components/pwa/OfflineBanner.tsx`
- Comportamento:
  - escuta `online/offline`
  - mostra aviso discreto: “Voce esta offline — mostrando o que esta salvo”
  - botao “Tentar reconectar” (dismiss local)
  - oculto em `/admin` e `/login`

## Offline page

- Rota: `/offline`
- Interface amigavel com:
  - mensagem clara
  - contexto `from` quando disponivel
  - atalhos para Home, Hub de vitrines e share pages recentes
  - CTA de retry
  - retorno para Home

## Debug rapido

1. Abrir DevTools > Application > Service Workers.
2. Verificar registro de `/sw.js`.
3. Em Manifest, validar icones e atalho.
4. Simular offline e abrir `/offline`.

## App-grade navigation (VIZ-09)

- Barra de progresso global:
  - componente `components/nav/RouteProgress.tsx`
  - inicia em `cv:navigation-start` e conclui em `cv:page-ready`
  - escondida quando `data-motion='off'` ou reduced-motion.
- Marker de pagina pronta:
  - `components/nav/PageReadyMarker.tsx`
  - aplicado no `WorkspaceShell`, Home e Hub.
- Prefetch inteligente:
  - `components/nav/PrefetchLink.tsx`
  - `hooks/useSmartPrefetch.ts`
  - prefetch no hover/focus e por visibilidade (IntersectionObserver)
  - bloqueios:
    - `/admin*`, `/login`, `/api*`, externos
    - `saveData=true`
    - `effectiveType=2g|slow-2g`
    - modo snapshot (`data-motion='off'` ou `?snapshot=1`).

## Focus mode (VIZ-11)

- Atalho desktop: `f` alterna foco global.
- Snapshot mode (`UI_SNAPSHOT=1`, `data-motion='off'` ou `?snapshot=1`) desliga o foco para evitar diffs em CI.
- Em mobile, o toggle fica no cabecalho dos paineis de detalhe/leitura.

## Feedback app-grade (VIZ-12)

- Preferencias novas em `ui_settings`:
  - `haptics` (default: `false`)
  - `sound_cues` (default: `false`)
- Engine client-side:
  - `lib/feedback/feedback.ts`
  - `vibrate()` curto (10-20ms)
  - `playCue()` via WebAudio (beep curto)
  - `feedback(type)` aplica somente com opt-in do usuario.
- Pontos aplicados:
  - copiar link/citacao
  - compartilhar
  - concluir passo (trilhas/tutor)
  - marcar evidencia aberta no fluxo de estudo
  - persistencia/checklist com sucesso/erro em operacoes de distribuicao.

## Safe areas e ergonomia mobile
- `header`, `offline-banner`, `dock nav`, `workspace-sheet` e `workspace-drawer` usam safe areas para evitar corte por notch e barras do sistema.
- O dock nav mobile foi mantido dentro do shell do PWA com padding extra no rodape e targets maiores para uso com polegar.
- O prompt de instalacao iOS reaproveita o `workspace-sheet` com espacamento seguro no rodape.
