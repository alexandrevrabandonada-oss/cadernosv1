# Estado da Nacao - Cadernos Vivos
Data: 2026-03-12
Prompt: PROD-18
Commit (se possivel): n/a

## 1) O que entrou neste tijolo
- Nova rota admin `/admin/universes/inbox` para criar universos a partir de dropzone de PDFs.
- Fluxo completo `dropzone -> analise -> bootstrap -> ingest -> board` integrado ao programa editorial principal.
- Engine `lib/universe/inbox.ts` com analise de lote, clustering por tema, sugestao de template, nos core, glossario, perguntas e resumo.
- Criacao do universo reaproveitando o bootstrap existente, sem publicar nada automaticamente e sem promover evidencia para o publico.
- Entrada imediata do novo universo no board editorial em `ingest` quando ha PDFs e em `bootstrap` quando nasce so a estrutura.

## 2) Rota e UX novas
- `/admin/universes/inbox` tem tres areas: dropzone de PDFs, painel de analise do lote e painel de criacao do universo.
- A lista de upload mostra nome do arquivo, tamanho, status e preview textual/titulo extraido quando possivel.
- O passo de revisao agora exibe titulo, slug, resumo, template, nos core, glossario, perguntas de partida e trilha `Comece Aqui`.
- Quando a analise detecta mistura, a UI avisa e oferece o CTA `Separar lote em 2 universos` como orientacao operacional.

## 3) Engine de inbox
Arquivo principal:
- `lib/universe/inbox.ts`

Funcoes centrais:
- `analyzePdfBatch(files)`
- `clusterBatchByTheme(batch)`
- `suggestUniverseFromBatch(batch)`
- `suggestUniverseTemplate(batch)`
- `suggestCoreNodes(batch)`
- `suggestGlossary(batch)`
- `suggestStarterQuestions(batch)`
- `suggestSummary(batch)`

Guardrails implementados:
- fallback para `blank_minimal` quando ha poucos sinais tematicos comuns ou texto fraco demais
- aviso de OCR fraco
- aviso de mistura tematica
- nenhum publish automatico
- nenhuma promocao automatica de evidencia publica

## 4) Pipeline apos confirmacao
- cria universo via bootstrap por template
- registra documentos importados no universo
- enfileira ingest quando o editor escolhe essa opcao
- garante o programa editorial principal quando necessario
- adiciona o universo ao board na lane correta

## 5) Como testar
1. Abrir `/admin/universes/inbox`.
2. Arrastar 3 a 5 PDFs do mesmo tema.
3. Revisar sugestoes de titulo, slug, resumo, template, nos core, glossario e perguntas.
4. Clicar em `Criar universo e enfileirar ingest`.
5. Abrir o Hub preview, o checklist, os docs e o board editorial para conferir o novo card.

## 6) Arquivos principais
- `app/admin/universes/inbox/page.tsx`
- `components/admin/UniverseInboxClient.tsx`
- `app/api/admin/universes/inbox/route.ts`
- `lib/universe/inbox.ts`
- `supabase/migrations/20260312173000_universe_inbox.sql`
- `tests/universe-inbox.test.ts`
- `tests/e2e/ui-smoke.spec.ts`
- `docs/UNIVERSE_INBOX.md`

## 7) Verificacoes finais
- `npm run verify`: ✅ Verify passou
- `npm run test:e2e:ci`: ✅ E2E passou
- `npm run test:ui:ci`: ✅ Visual passou
