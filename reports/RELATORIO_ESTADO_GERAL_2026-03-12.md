# Relatorio de Estado Geral - Cadernos Vivos
Data: 2026-03-12
Base do codigo: commit `d6da082`
Escopo: fotografia executiva do projeto apos a entrega do Universe Inbox

## 1) Resumo executivo
O projeto esta em um estado avancado de MVP operacional com trilha admin, universos publicos, board editorial multiuniverso, ingest de documentos, qualidade, share/export, caderno pessoal, coletivos, tutor/tutoria, PWA e camada de testes automatizados.

O ganho mais recente foi a entrada do fluxo `Universe Inbox`, que reduz o atrito para criar universos a partir de um lote de PDFs e conecta esse material ao bootstrap e ao board editorial sem publicar nada automaticamente.

## 2) Stack e arquitetura
- Frontend/app: Next.js 15 com App Router
- UI: React 18
- Linguagem: TypeScript
- Backend principal: rotas server/app + Supabase
- Banco e auth: Supabase
- Observabilidade: Sentry
- Testes unitarios: Vitest
- Testes e2e/visuais: Playwright

## 3) Modulos ja presentes
- Universos publicos com hub e navegacao por secoes
- Admin de universos com bootstrap por template e clone estrutural
- Board editorial com lanes `bootstrap`, `ingest`, `quality`, `sprint`, `review`, `highlights`, `publish`, `done`
- Ingest de PDFs com jobs, qualidade e processamento
- Mapa, provas, linha, glossario, debate e trilhas
- Meu Caderno e coletivos compartilhados
- Share pages, exports e pack semanal
- Tutor, tutoria e progresso
- PWA com manifest, offline shell e service worker

## 4) Estado atual do admin/editorial
O admin ja cobre o ciclo principal de operacao editorial:
- criar universo por template
- criar universo por clone estrutural
- operar board multiuniverso
- acompanhar checklist por universo
- importar e ingerir documentos
- distribuir highlights/share packs
- abrir o novo fluxo `/admin/universes/inbox`

O `Universe Inbox` ja entrega:
- dropzone de PDFs
- analise inicial do lote
- sugestao de titulo, slug, resumo e template
- sugestao de nos core, glossario, perguntas e trilha inicial
- criacao do universo com entrada no board
- lane `ingest` quando ha PDFs anexados
- lane `bootstrap` quando nasce so a estrutura

## 5) Cobertura de codigo e artefatos
Contagem atual do repositorio:
- arquivos em `tests/`: 58
- arquivos em `docs/`: 45
- migrations em `supabase/migrations/`: 48

Isso indica uma base ja relativamente madura para o estagio atual, com volume relevante de documentacao e de regressao automatizada.

## 6) Verificacao mais recente
Ultima rodada executada:
- `npm run verify`: passou
- `npm run test:e2e:ci`: passou
- `npm run test:ui:ci`: passou
- `npm run test -- tests/universe-inbox.test.ts`: passou

Observacao operacional:
- a suite E2E registrou um flaky conhecido no request do manifesto PWA (`ECONNRESET` no primeiro acesso), mas o job fechou verde no retry
- a suite visual exigiu ajuste localizado na tolerancia da matriz `mobile_compact_low` para estabilizar snapshots

## 7) Sinais de saude
Pontos fortes:
- fluxo editorial principal funcional de ponta a ponta
- boa cobertura de smoke e visual para paginas criticas
- estrutura de docs consistente para onboarding e operacao
- automacao de verify/build/typecheck funcionando
- board editorial e bootstrap reaproveitados em vez de fluxos paralelos

## 8) Riscos e debitos visiveis
- ainda ha drift visual em mobile `compact/low`, mitigado por tolerancia maior no helper visual; vale revisar a causa raiz depois
- `next lint` segue funcionando, mas esta marcado como deprecated para Next 16
- warnings nao bloqueantes do webpack cache continuam aparecendo em build
- existem mudancas locais nao commitadas no workspace fora do escopo do ultimo commit

## 9) Mudancas locais abertas no workspace
No momento deste relatorio, havia alteracoes locais fora do commit mais recente em:
- `app/admin/page.tsx`
- `app/admin/universes/page.tsx`
- `docs/BOOTSTRAP_UNIVERSE.md`
- `docs/PROGRAMA_EDITORIAL.md`

Esses arquivos pedem triagem antes do proximo commit para evitar misturar frentes distintas.

## 10) Leitura pratica do estado da nacao
Se a pergunta for "o projeto ja da para operar?", a resposta curta e: sim, em modo admin/editorial controlado.

Se a pergunta for "o que falta para endurecer mais?", os proximos passos com melhor retorno parecem ser:
- reduzir flakiness da suite visual/mobile
- revisar os pontos ainda dependentes de mock/test seed
- consolidar docs gerais apos os ultimos tijolos do admin
- continuar endurecendo ingest/quality/review com dados reais

## 11) Conclusao
O projeto ja saiu do estado de prototipo solto e entrou em um estado de produto editorial operavel, com fluxo coerente entre criacao de universo, ingest, curadoria, distribuicao e leitura publica controlada.

A entrega de `Universe Inbox` melhora bastante a ergonomia do admin e aproxima o produto de um fluxo real de redacao/pesquisa baseado em lote documental.
