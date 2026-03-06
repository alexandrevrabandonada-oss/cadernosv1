# Offline inteligente (vitrine-first)

## O que funciona offline

- App shell (header, nav, estilos principais)
- Home (`/`)
- Hubs de universos publicados selecionados no `offline-seed`
- Share pages recentes (`/c/[slug]/s/*`)
- Rota `/offline` com atalhos de retorno

## O que nao e cacheado

- Qualquer rota `/admin/*`
- `/api/admin/*`
- `/api/auth/*`
- Conteudo privado:
  - `/c/[slug]/tutor/s/*`
  - `/c/[slug]/exports/*`
- Requests `POST`

## Como o seed e escolhido

- Endpoint publico: `/api/public/offline-seed`
- Prioriza:
  1. universos publicados de vitrine
  2. share pages mais acessadas nas ultimas 24h (analytics)
  3. fallback por highlights, quando analytics nao existe

## Limites

- SW usa TTL simples por rota (24h share/og, 6h salas do universo)
- cache e podado por quantidade de entradas para evitar inflar armazenamento
- modo offline e leitura/publico-first; nao substitui rede para fluxo de edicao

## Limpar cache

1. Abrir DevTools > Application > Storage.
2. Limpar `Cache Storage`.
3. Recarregar para reinstalar o service worker e repopular caches.


## Persistencia local de highlights do Doc Viewer

- Visitante salva highlights do documento em localStorage por universo com o mesmo namespace do Meu Caderno.
- Logado faz merge local + remoto e sincroniza via `/api/notes` sem bloquear a leitura offline.
- O fluxo offline-first cobre ao menos export local/consulta local do trecho salvo quando nao houver rede.
