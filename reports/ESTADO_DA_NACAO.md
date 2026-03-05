# Estado da Nação — Cadernos Vivos
Data: 2026-03-05
Commit (se possível): n/a

## 1) O que mudou neste tijolo (VIZ-02)
- Home (`/`) foi refeita como portal público editorial em 5 blocos.
- Hub (`/c/[slug]`) foi reestruturado como entrada de universo em 6 blocos.
- Hierarquia visual reforçada com hero escultural, portas grandes e ritmo de leitura (blocos largos + tiras + cards).

## 2) O que mudou em `/` (Home)
- Hero novo com:
  - headline forte
  - subtítulo curto de posicionamento
  - CTAs `Explorar universos` e `Entender como funciona`
  - painel lateral de universo em foco
- Portas de entrada:
  - `Explorar Provas`
  - `Seguir uma Trilha`
  - `Entrar no Tutor`
- Universos em destaque:
  - cards editoriais com badges (`nos`, `trilhas`, `provas`) e CTA único
  - destaque visual para universo com vitrine
- Fios quentes:
  - strip editorial com até 6 itens (evidence/event/question) baseado no universo em foco
- Como funciona:
  - bloco curto em 3 passos (entrar, explorar com prova, compartilhar)

## 3) O que mudou em `/c/[slug]` (Hub)
- Hero do universo:
  - título com presença
  - subtítulo/missão
  - meta bar viva (`atualizado`, `nos`, `trilhas`, `provas`)
  - badge de visibilidade e estado de vitrine
- 3 portas principais:
  - Provas
  - Mapa
  - Debate
- Comece Aqui fortalecido:
  - bloco dedicado com CTA de trilha/tutor
  - 3 perguntas prontas em cartões
- Destaques editoriais:
  - 1 destaque principal + grade secundária
  - links para Provas/Linha/Debate conforme tipo
- Portais/próximas portas:
  - strip editorial + `PortalsRail` integrado
- Continuar de onde parou:
  - card de retomada forte para usuário logado

## 4) Novos componentes criados
- `components/universe/HeroPanel.tsx`
- `components/universe/UniverseMetaBar.tsx`
- `components/universe/BigPortalCard.tsx`
- `components/universe/HighlightsStrip.tsx`
- `components/universe/ResumeJourneyCard.tsx`

## 5) Arquivos principais alterados
- Home:
  - `app/page.tsx`
- Hub:
  - `app/c/[slug]/page.tsx`
- Estilos de composição/editorial/mobile:
  - `app/globals.css`
- Documentação de UI:
  - `docs/UI.md`

## 6) Como testar (manual)
1. Abrir a Home e validar hero + portas + universos + fios quentes + como funciona.
2. Abrir o Hub de um universo e validar hero do universo + 3 portas + Comece Aqui + Destaques.
3. Comparar desktop e mobile:
  - hero compacto no mobile
  - cards em coluna única
  - CTA principal acima da dobra.

## 7) Verificações
- ✅ Verify passou
  - `npm run verify`
- ✅ E2E passou
  - `npm run test:e2e:ci`
- ✅ Visual passou
  - `npm run test:ui:ci`
