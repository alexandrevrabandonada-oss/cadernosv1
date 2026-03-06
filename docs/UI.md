# UI System - Concreto Zen

## Direcao visual

- Tema: `Concreto Zen // Arquivo Vivo`.
- Estilo: industrial-editorial contemporaneo, com atmosfera de arquivo navegavel.
- Objetivo: sair do visual dashboard genérico e reforcar sensação de “portal de universo”.
- Textura: grade cartografica suave em baixa opacidade, sem ruído excessivo.
- Paleta base:
  - grafite profundo
  - cimento frio
  - chumbo azulado
  - off-white quente
- Acentos:
  - `accent-action` (verde sinal)
  - `accent-editorial` (amarelo ferrugem-luz)
  - vermelho restrito a alerta/contradicao

## Principios

- Contraste forte entre texto, superfícies e linhas estruturais.
- Foco visível em links, botões e tabs via `:focus-visible`.
- Área clicável mínima de 44px para interações primárias.
- Componentes leves, sem framework visual pesado.
- Hierarquia tipográfica marcada:
  - headlines com presença editorial
  - labels em micro caixa alta com tracking
- Assinaturas visuais:
  - halo de seleção forte (`data-selected`)
  - superfícies por família (`panel`, `plate`, `blade`)

## Tokens

Arquivo: `styles/tokens.css`

- Cores semânticas:
  - `--surface-panel`
  - `--surface-plate`
  - `--surface-blade`
  - `--accent-action`
  - `--accent-editorial`
  - `--status-warning`, `--status-danger`, `--status-ok`
- Tipografia: `--font-sans`, `--font-mono`.
- Forma: `--radius-sm`, `--radius-md`, `--radius-lg`.
- Sombra: `--shadow-0`, `--shadow-1`.
- Espaçamento: `--space-1` ... `--space-6`.

## Componentes base

Pasta: `components/ui`

- `Button`: variantes `primary`, `neutral`, `ghost`; suporta `href` e `button`.
- `Card` / `Placa`: superfícies com `surface='panel|plate|blade'`.
- `Badge` / `Carimbo`: rótulo de estado curto.
- `SectionHeader`: título de seção com descrição e tag opcional.
- `Breadcrumb`: trilha de navegação com `aria-label`.
- `PortalLink`: bloco navegável para entrada em áreas do produto.
- `Segmented`: alternância de seções com semântica de tabs (`role='tablist'`).
- `Skeleton` / `LoadingBlock`: placeholders visuais de carregamento.

## Diferenca para VR Abandonada

- Herdamos:
  - densidade editorial
  - contraste alto
  - linguagem industrial
- Nao copiamos literalmente:
  - paleta identica da VR
  - motivos visuais exclusivos da marca VR
- Cadernos Vivos adota leitura mais “arquivo vivo”:
  - atmosfera técnica e navegável
  - menos manifesto visual, mais instrumento de exploração

## Home e Hub como Portal

- Home (`/`) deixa de ser catalogo seco e vira portal publico com 5 blocos:
  - hero narrativo com CTA principal
  - portas de entrada (Provas, Trilhas, Tutor)
  - universos em destaque
  - fios quentes (itens editoriais recentes)

## Meu Caderno

- Rota: `/c/[slug]/meu-caderno`.
- Funcao: consolidar highlights e notas pessoais por universo com abertura da origem.
- Captura de notas (V1):
  - Provas detail (focus): salvar trecho de evidence/chunk.
  - Debate detail: salvar pergunta+achado e citacoes.
  - Tutor point lab: salvar resposta guiada.
  - Doc viewer: salvar citacao.
- Visitante: localStorage offline-first.
- Logado: sync best-effort com `user_notes` (RLS owner-only).
  - como funciona em 3 passos
- Hub (`/c/[slug]`) vira entrada de universo com 6 blocos:
  - hero escultural do universo
  - metadados vivos (atualizado, nos, trilhas, provas)
  - 3 portas principais grandes
  - bloco Comece Aqui forte (trilha + perguntas prontas)
  - destaques editoriais com principal + secundarios
  - continuidade (portais e "continuar de onde parou")
- Componentes reutilizaveis de portal:
  - `HeroPanel`
  - `UniverseMetaBar`
  - `BigPortalCard`
  - `HighlightsStrip`
  - `ResumeJourneyCard`

## Exemplo rapido

```tsx
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Segmented } from '@/components/ui/Segmented';

<Card className='stack'>
  <SectionHeader title='Mapa' description='Visao geral do universo' tag='Secao' />
  <Segmented label='Alternar secao' items={items} currentPath='/c/exemplo/mapa' />
</Card>;
```

## Aplicacao no app

- Header global com botões de navegação e contraste alto.
- QuickNav lateral para `/c/[slug]`.
- Hub e seções dinâmicas usam `Breadcrumb`, `SectionHeader` e `Segmented`.
- Loading states em `app/loading.tsx` e `app/c/[slug]/loading.tsx`.

## Highlight de citacoes no viewer

- Rota: `/c/[slug]/doc/[docId]?thread=<qa_thread_id>&cite=<citation_id>`.
- Comportamento:
  - sidebar com citacoes da thread para o documento.
  - navegacao anterior/proxima entre citacoes.
  - highlight do trecho em contexto (janela reduzida, nao renderiza chunk inteiro).
- Estrategia:
  - preferencia por offsets (`quote_start`, `quote_end`).
  - fallback por busca textual da quote no chunk.
  - se falhar, exibe aviso e mostra quote sem highlight automatico.

## Workspace 3-paineis

Pasta: `components/workspace`

- `WorkspaceShell`:
  - desktop: 3 colunas (FilterRail, conteudo, DetailPanel)
  - mobile: filtros em drawer + detalhe em bottom-sheet + DockNav fixo
- `FilterRail`:
  - wrapper padrao para filtros e controles de contexto
- `DetailPanel`:
  - painel direito no desktop
  - bottom-sheet no mobile
  - fecha no overlay, no botao e com tecla `ESC`
  - trap de foco simples quando aberto no mobile
- `DockNav`:
  - navegacao inferior mobile-first para secoes de `/c/[slug]/*`
- `useWorkspacePanels`:
  - sincroniza estado com query params:
    - `selected=<id>`
    - `panel=detail|filters`

### Padrao de Sala (acabamento transversal)

- Toda secao principal (`Provas`, `Linha`, `Debate`, `Mapa`, `Glossario`, `Trilhas`) segue o mesmo ritmo:
  - header de sala com kicker + titulo forte + subtitulo funcional
  - trilho de filtros com rotulos tecnicos e recortes claros
  - conteudo central com cards/listas de alto contraste (titulo > meta)
  - painel de detalhe como objeto em foco (resumo, metadados, relacionados, portas)
  - bloco de continuidade com `PortalsRail`
- Microcopy da sala deve evitar placeholder e manter tom:
  - editorial
  - investigativo
  - objetivo
- Estados vazios:
  - nunca apenas "sem resultados"
  - sempre indicar recorte aplicado e uma proxima acao clara

### Query params padrao

- `selected`: item selecionado para detalhe
- `panel=detail`: abre painel de detalhe no mobile
- `panel=filters`: abre drawer de filtros no mobile

## Provas v2 (Evidence-first)

Rota: `/c/[slug]/provas`

- Objeto principal: `evidences` curadas.
- Fallback: `chunks` nao arquivados quando ha baixa cobertura curada.
- Filtros serializados em URL:
  - `type=evidence|chunk`
  - `yearFrom`, `yearTo`
  - `tags` (csv)
  - `node` (node slug)
  - `q` (busca textual)
  - `relatedTo` (id)
  - `selected`, `panel`, `cursor`
- Layout:
  - esquerda: `FilterRail` com filtros reais
  - centro: grid editorial de cards
  - direita/mobile sheet: detalhe rico com preview, citacao, tags e relacionados
- Deep link:
  - URL com filtros + `selected` reabre o mesmo estado
  - botao "Copiar link" compartilha o estado atual da tela

## Timeline v2 (Linha)

Rota: `/c/[slug]/linha`

- Layout no padrao workspace:
  - esquerda: filtros
  - centro: timeline vertical
  - direita/mobile sheet: detalhe do item selecionado
- Filtros serializados em URL:
  - `kind` (csv ou multi)
  - `yearFrom`, `yearTo`
  - `node` (slug)
  - `tags` (csv)
  - `q`
  - `selected`
  - `panel`
  - `cursor`
- Detail panel:
  - titulo, data, tipo, descricao completa
  - tags clicaveis (reaplicam filtro)
  - relacionados: no, documento e `source_url`
  - CTA `Ver Provas` que abre `/provas` com filtros de contexto (node/tags/ano/relatedTo)

## Debate v2 (Inbox + Lentes)

Rota: `/c/[slug]/debate`

- Estrutura:
  - esquerda: filtros
  - centro: inbox de threads (`qa_threads`)
  - direita/mobile sheet: detalhe da thread selecionada
- Filtros em URL:
  - `lens=default|worker|resident|researcher|policy`
  - `node=<slug>`
  - `kind=all|default|guided|tutor_chat`
  - `status=all|strict_ok|insufficient`
  - `q`
  - `yearFrom`, `yearTo`
  - `selected`, `panel`, `cursor`
- Detail panel:
  - pergunta + resposta em secoes
  - evidencias/citacoes da thread
  - CTA `Ver Provas` com contexto da thread
  - CTA `Abrir 1a evidencia` no doc viewer
  - CTA `Gerar dossie` (export thread)
  - `Follow-up` chamando `/api/ask` com `scope.documentIds`
- Deep-link:
  - URL com `selected` reabre o detalhe no desktop e mobile.

## Trilhas v2 (Cards + Player + Ramificacao)

Rota: `/c/[slug]/trilhas`

- Modo lista (`mode=list`, padrao):
  - cards por trilha com meta (passos, duracao estimada, foco)
  - badges: `Comece Aqui`, `Tutor-ready`
  - CTA `Abrir trilha` e `Abrir no Tutor` quando aplicavel
- Modo player (`mode=player&trail=<slug|id>&step=<n>`):
  - `WorkspaceShell` com:
    - esquerda: stepper (passos da trilha)
    - centro: passo ativo (goal, leituras, pergunta guiada, checkpoint)
    - direita: progresso e atalhos filtrados para Provas/Linha/Debate
- Ramificacao `Quer seguir por...`:
  - por no core: abre Provas/Linha/Debate com `node=<slug>`
  - por tipo: abre Provas/Linha/Debate/Tutor
  - por tags: abre Provas com `tags=<tag>`
- Deep-link:
  - `trail`, `step`, `mode` mantem estado navegavel/compartilhavel.

## Glossario v1

Rota: `/c/[slug]/glossario`

- Layout no padrao Workspace:
  - esquerda: filtros (busca, letra A-Z, tags)
  - centro: lista de termos
  - direita/mobile sheet: detalhe do termo selecionado
- Query params:
  - `q`
  - `letter`
  - `tags` (csv)
  - `selected`
  - `panel`
  - `cursor`
- Detail panel:
  - definicao curta + corpo
  - tags clicaveis (refiltram)
  - nos relacionados
  - evidencias destacadas
  - perguntas sugeridas (atalho para Debate)
  - CTAs:
    - Ver Provas
    - Ver Debate
    - Ver Linha
    - Abrir no Tutor
- Mobile:
  - item `Glossario` adicionado ao DockNav.

## Mapa v2 (Explorer)

Rota: `/c/[slug]/mapa`

- Estrutura:
  - esquerda: filtros
  - centro: explorer de nos (placas + conexoes leves SVG)
  - direita/mobile sheet: detalhe operacional do no
- Query params:
  - `q`
  - `kind` (multi/csv)
  - `core=1`
  - `tags` (csv)
  - `coverage=low|mid|high`
  - `node=<nodeSlug>` (deep-link principal)
  - `selected=<nodeId>` (compat)
  - `panel=detail|filters`
- Detail panel:
  - resumo + tags + badges de cobertura
  - contagens: docs/evidencias/perguntas
  - evidencias do no (top)
  - perguntas sugeridas (atalho para Debate)
  - docs vinculados (top)
  - portais:
    - Ver Provas (node)
    - Ver Linha (node)
    - Ver Debate (node + strict_ok)
    - Abrir no Tutor
- Integracoes:
  - Glossario, Linha e Debate apontam para `/mapa?node=<slug>&panel=detail`.

## Mapa v2 Cluster (UI-09)

- Camadas visuais:
  - Camada 1: `view=core` (padrao, foco em nos core)
  - Camada 2: `view=clusters` (cards de cluster por tag/kind)
  - Camada 3: entrada no cluster com `cluster=<tag>`
- Query params novos:
  - `view=core|clusters|all` (compativel com `view=cluster`)
  - `cluster=<tag>`
  - `selected=cluster:<tag>` para detalhe de cluster
  - deep-link de cluster: `/mapa?view=cluster&cluster=metais&panel=detail`
- UX:
  - clique no card do cluster = "Entrar no cluster"
  - filtro mostra "Sair do cluster"
  - detalhe troca automaticamente:
    - cluster selecionado: resumo agregado + top nos + portais por tag
    - no selecionado: detalhe operacional tradicional
- Performance:
  - modo `all` limitado a 120 nos por tela
  - aviso quando houver truncamento e incentivo a filtros.

## Portais contextuais (UI-08)

- Componente padrao: `components/portals/PortalsRail.tsx`
- Gerador central de links: `lib/portals/buildPortals.ts`
- Objetivo:
  - reduzir CTA isolado por tela
  - manter navegacao orientada por contexto
  - garantir consistencia de filtros e deep-links
- Contextos suportados:
  - `none`, `node`, `tag`, `event`, `thread`, `term`, `trail`, `tutor_session`
- Reuso de serializers oficiais:
  - Provas: `serializeProvasFilters`
  - Linha: `serializeTimelineFilters`
  - Debate: `serializeDebateFilters`
  - Mapa: `serializeMapFilters`
  - Glossario: `serializeGlossarioFilters`
- Aplicacao:
  - DetailPanel de Provas, Linha, Debate, Glossario e Mapa
  - fim do Hub (`/c/[slug]`)
  - player de Trilhas (bloco Relacionados)
  - fim do Tutor done (`/c/[slug]/tutor/s/[sessionId]/done`)

## Atalhos + Command Palette (UI-10)

- Atalhos globais (desktop):
  - `/` abre command palette
  - `Ctrl/Cmd + K` abre command palette
  - `g m` -> Mapa
  - `g p` -> Provas
  - `g l` -> Linha
  - `g d` -> Debate
  - `g g` -> Glossario
  - `g t` -> Trilhas
  - `g u` -> Tutor
  - `Esc` fecha palette e tenta fechar painéis (detail/filters)
- Regras:
  - atalhos nao disparam em `input/textarea/select/contenteditable`
  - foco preso no modal da palette (trap simples com Tab)
- Componentes:
  - `components/command/CommandPalette.tsx`
  - `hooks/useShortcuts.ts`
  - `components/workspace/WorkspaceContext.tsx`
- API:
  - `GET /api/palette?universeSlug=<slug>&q=<termo>`
  - retorna top nodes e termos do glossario para navegacao rapida.

## Microinteracoes (UI-11)

- Base visual:
  - transicoes padrao com tokens de motion (`--motion-*`, `--ease-standard`)
  - foco forte com contraste alto (`--focus-strong`)
  - estados de selecao em cards (`data-selected`)
- Loading:
  - `SkeletonLine`, `SkeletonCard`, `SkeletonGrid`, `SkeletonDetail`
  - aplicados em loading de universo e detalhe (troca de selected)
- Empty states:
  - componente unificado `EmptyState`
  - variantes: `no-results`, `no-data`, `not-published`, `needs-curation`
  - aplicado nas listas centrais de Provas/Linha/Debate/Glossario/Mapa
- Toasts:
  - `ToastProvider` global + `useToast()`
  - casos aplicados:
    - copiar citacao/link
    - export gerado/erro
  - `aria-live="polite"` e stack acima do DockNav no mobile
- Reduced motion:
  - `@media (prefers-reduced-motion: reduce)` desativa animacoes/transicoes relevantes.

## Densidade + selecao forte (UI-12)

- Densidade:
  - toggle global em `WorkspaceShell`: `Compacto | Normal`
  - persistencia em `localStorage` (`cv:density`)
  - aplica em `document.documentElement[data-density=...]`
  - tokens ajustados:
    - `--cv-card-pad`
    - `--cv-card-gap`
    - `--cv-font-sm`
- Selected state:
  - listas centrais usam `data-selected="true"`
  - estilo forte:
    - borda e fundo destacados
    - indicador lateral amarelo discreto
- Navegacao por teclado nas listas (desktop):
  - `ArrowUp/ArrowDown` move selecao
  - `Home/End` salta para inicio/fim
  - `Enter` abre detalhe (`panel=detail`)
  - desativa quando foco esta em input/textarea/contenteditable
  - desativa quando command palette esta aberta

## Smoke E2E (UI-13)

- Suite Playwright:
  - arquivo: `tests/e2e/ui-smoke.spec.ts`
  - foco: regressao de UX nas telas criticas
- Cobertura:
  - Provas: grid, selected, detalhe, empty state
  - Linha: detalhe e CTA para Provas
  - Debate: troca de lente + CTA para Provas
  - Glossario: detalhe + CTA `Ir para No`
  - Mapa: `view=clusters`, entrada em cluster e portal
  - Densidade (`Compacto/Normal`) e teclado (`ArrowDown`, `Enter`)
- Estrategia:
  - checks por `data-testid`/URL (sem snapshot visual pesado)
  - modo deterministico via `TEST_SEED=1` para CI sem dependencia de banco externo

## Identidade de Marca (VIZ-04)

- Sistema de marca operacional introduzido para todo o produto:
  - `Wordmark` oficial (`hero`, `nav`, `compact`, `mono`)
  - iconografia proprietaria (`BrandIcon`)
  - selos editoriais (`UniverseSeal`, `EvidenceSeal`, `ConfidenceSeal`)
  - moldura de imagem editorial (`EditorialMediaFrame`)
- Principios:
  - assinatura institucional viva (arquivo + navegacao), sem estetica SaaS generica
  - sem copiar literalmente VR Abandonada
  - sem perder legibilidade em dark/mobile/texture-low
- Aplicacao:
  - header, Home e Hub
  - headers de sala no Workspace e DockNav
  - Provas e Debate (selos operacionais)
  - share pages e OG cards com assinatura compacta
- Referencia de marca:
  - ver `docs/BRAND.md`

## De-GeoCities Pass (VIZ-05)

- Objetivo:
  - remover linguagem visual de site antigo e consolidar shell PWA 2026.
- Mudancas de base:
  - tokens de superficie/raio/sombra/blur modernizados
  - neutralizacao de bordas tracejadas e bevels pesados
  - botoes e segmented com estados contemporaneos (halo, pressed, hover)
  - header/nav com shell translucido + blur
- Portas com preview real:
  - componentes:
    - `MiniPreviewProvas`
    - `MiniPreviewMapa`
    - `MiniPreviewLinha`
    - `MiniPreviewDebate`
  - aplicados em Home e Hub para eliminar placeholders vazios.
- Home:
  - hero com contraste mais forte
  - portas editoriais com previews reais
  - fallback quando nao ha universo publicado com CTA de operacao.
- Hub:
  - hero reforcado + metadados vivos
  - portas principais com preview real
  - destaque editorial principal + secundarios preservados.
- Compatibilidade:
  - mantido suporte de `texture=low`
  - mantido `prefers-reduced-motion`.

## Tipografia + Ritmo (VIZ-06)

- Escala tipografica semantica introduzida em `styles/tokens.css`:
  - familias: `--font-display`, `--font-head`, `--font-body`, `--font-ui`
  - tamanhos: `--fs-display-1/2`, `--fs-h1/h2/h3`, `--fs-body`, `--fs-ui`, `--fs-micro`
  - ritmo: `--lh-tight/normal/roomy`
  - tracking: `--tracking-tight/normal/wide`
- Spacing editorial:
  - novos tokens `--space-7`, `--space-8`
  - classe `stack-editorial` para blocos de entrada (Home/Hub) com mais respiro.
- Density:
  - `data-density="compact"` reduz UI/micro e line-height sem perder legibilidade.
- Microcopy revisada:
  - Home e Hub com linguagem menos genérica e mais orientada a leitura por salas.
  - Provas e Mapa com subtítulos mais funcionais/editoriais.

## Motion Premium (VIZ-07)

- Sistema de motion tokenizado:
  - `--ease-standard`, `--ease-emphasized`
  - `--dur-1`, `--dur-2`, `--dur-3`, `--dur-4`
- Utilitarios em `styles/motion.css`:
  - `.cv-motion`, `.cv-hover`, `.cv-press`
  - `.cv-panel-enter`, `.cv-panel-exit`
  - `.cv-snap-row`, `.cv-scroll-cue`
- Aplicacoes principais:
  - `DetailPanel`, drawer e bottom-sheet com transicoes unificadas (transform/opacity)
  - `HighlightsStrip` e `PortalsRail` com `scroll-snap` no mobile + cue visual de arraste
  - cards e CTAs com micro deslocamento de hover/press (1px)
- Reduced motion:
  - `prefers-reduced-motion` remove animacoes e snap agressivo.
- Modo snapshot:
  - `data-motion='off'` desativa transicoes globalmente.
  - Ativado por:
    - `UI_SNAPSHOT=1` (env)
    - `?snapshot=1` (query)
  - Playwright aplica `data-motion='off'` no helper visual para reduzir flake.

## App-grade navigation (VIZ-09)

- Feedback de rota:
  - `RouteProgress` no topo global com atraso curto (evita flicker)
  - conclui por evento `cv:page-ready` emitido por `PageReadyMarker`.
- Prefetch inteligente:
  - `PrefetchLink` unifica prefetch por hover/focus e opcional por visibilidade
  - `useSmartPrefetch` usa `IntersectionObserver` para Portals/Portas principais.
- Guardrails de prefetch:
  - desabilita para `admin`, `login`, `api` e links externos
  - desliga com rede lenta (`saveData`, `2g/slow-2g`)
  - desliga em snapshot mode (`data-motion='off'`).

## Modo Imersao (VIZ-11)

- Preferencia global:
  - `ui_settings.focus_mode` (default `false`)
  - aplicada em `html[data-focus='on|off']`
- Toggle:
  - `FocusToggle` no header do `WorkspaceShell`, no header do `DetailPanel` e em telas de leitura (Doc/Trilhas/Tutor).
- Atalho:
  - tecla `f` (desktop), quando o foco nao esta em campo de digitacao e a palette nao esta aberta.
- Efeito visual:
  - reduz ruido/textura automaticamente
  - aumenta tamanho e entrelinha de leitura
  - oculta distracoes (DockNav, trilho de filtros e Portais contextuais quando aplicavel)
  - Provas detail prioriza bloco principal (Relacionados/Portais colapsados por padrao em foco)
- Snapshot mode:
  - `data-motion='off'` ou `?snapshot=1` forca `data-focus='off'` para estabilidade de screenshots.

## VIZ-19 — Mobile ergonomics
- Safe areas do shell agora respeitam `env(safe-area-inset-top|bottom|left|right)` no header, dock, banners e sheets.
- Tap targets principais foram normalizados para `44-48px` em CTAs, toggles, dock nav e acoes de detalhe.
- Home e Hub ganharam ajuste de densidade em telas pequenas, com hero, portal cards e textos mais compactos e legiveis.
- Detail panels, drawers e toolbar do Doc Viewer foram refinados como superfícies móveis com scroll interno mais previsível.

## VIZ-20 - State quality pass
- Taxonomia de estados consolidada em `components/ui/state/` com:
  - `StatePanel`
  - `EmptyStateCard`
  - `ErrorStateCard`
  - `RestrictedStateCard`
  - `SuccessInlineNotice`
  - `PartialDataNotice`
- Direcao de microcopy:
  - clara e editorial
  - sem placeholder tecnico
  - sempre com proxima acao quando fizer sentido
- Aplicacao prioritaria:
  - offline e dados parciais
  - exports privados
  - preview/editorial gating
  - recap, coletivos, review e analytics
- Regra de escolha:
  - `empty`: ainda nao ha material ou o recorte zerou
  - `error`: falha de fetch/acao ou link temporario indisponivel
  - `restricted`: bloqueio por publicacao, permissao ou privacidade
  - `partial`: parte do shell/dado segue acessivel, parte nao
  - `success`: confirmacao inline depois de acao maior
