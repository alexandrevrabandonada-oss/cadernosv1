# Estado da Nacao — Cadernos Vivos
Data: 2026-03-05
Commit (se possivel): n/a

## 1) O que mudou neste tijolo (VIZ-04)
- Implementada a camada de identidade de marca operacional do produto:
  - wordmark oficial
  - sistema de icones proprietario
  - selos/carimbos editoriais
  - moldura de midia editorial
- Aplicacao feita nas superficies mais visiveis:
  - header global
  - Home (`/`)
  - Hub (`/c/[slug]`)
  - headers de salas via `WorkspaceShell`
  - DockNav mobile
  - Provas (selos de evidencia)
  - Debate (selos de confianca/divergencia)
  - share pages (`/c/[slug]/s/*`)
  - OG cards (`/api/og`)

## 2) Novo wordmark
- Componente novo: `components/brand/Wordmark.tsx`
- Variantes:
  - `hero`
  - `nav`
  - `compact`
  - `mono`
- Uso principal:
  - `Header` usa wordmark oficial
  - Home/Hub usam assinatura hero/compact
  - share pages usam assinatura compacta

## 3) Sistema de icones
- Componente novo: `components/brand/icons/BrandIcon.tsx`
- Set de icones criado para:
  - salas: Provas, Linha, Debate, Mapa, Glossario, Trilhas, Tutor
  - distribuicao: Share, Export
  - estados: confianca forte/media/fraca, divergencia, review, publicado, vitrine
- Aplicado em:
  - Workspace headers
  - DockNav
  - Home/Hub
  - share pages

## 4) Selos/carimbos
- Componentes novos:
  - `components/brand/UniverseSeal.tsx`
  - `components/brand/EvidenceSeal.tsx`
  - `components/brand/ConfidenceSeal.tsx`
- Aplicacao:
  - Universe seal em Home/Hub
  - Evidence seal em Provas e share de node/term/evidence
  - Confidence seal em Debate

## 5) Padrao de imagens/editorial
- Componente novo:
  - `components/brand/EditorialMediaFrame.tsx`
- Uso:
  - Home e Hub (cards editoriais/portas)
  - base pronta para expandir em cards de outras salas

## 6) Onde a marca foi aplicada
- Header/Nav:
  - `components/Header.tsx`
- Home/Hub:
  - `app/page.tsx`
  - `app/c/[slug]/page.tsx`
- Workspace:
  - `components/workspace/WorkspaceShell.tsx`
  - `components/workspace/DockNav.tsx`
  - `styles/workspace.css`
- Salas:
  - `app/c/[slug]/provas/page.tsx`
  - `app/c/[slug]/debate/page.tsx`
- Share/OG:
  - `app/c/[slug]/s/page.tsx`
  - `app/c/[slug]/s/evidence/[id]/page.tsx`
  - `app/c/[slug]/s/thread/[id]/page.tsx`
  - `app/c/[slug]/s/event/[id]/page.tsx`
  - `app/c/[slug]/s/export/[id]/page.tsx`
  - `app/c/[slug]/s/node/[id]/page.tsx`
  - `app/c/[slug]/s/term/[id]/page.tsx`
  - `app/api/og/route.tsx`
- Estilos globais:
  - `app/globals.css`

## 7) Documentacao
- Novo guia:
  - `docs/BRAND.md`
- Atualizado:
  - `docs/UI.md` (secao de identidade de marca)

## 8) Como testar
1. Abrir Home e Header:
  - validar wordmark oficial e assinatura visual do hero.
2. Abrir Hub de um universo:
  - validar selos de vitrine/publicado, icones de portas e frame editorial.
3. Abrir Provas/Linha/Debate:
  - validar headers assinados por icone e selos em evidencia/confianca.
4. Abrir uma share page (`/c/[slug]/s/evidence/<id>` por exemplo):
  - validar assinatura compacta, CTA e estilo editorial.
5. Abrir `/api/og?type=universe&u=<slug>`:
  - validar card OG com assinatura compacta.

## 9) Verificacoes
- ✅ Verify passou
  - `npm run verify`
- ✅ E2E passou
  - `npm run test:e2e:ci`
- ✅ Visual passou
  - `npm run test:ui:ci`
