# Estado da Nacao - Cadernos Vivos V1

Data: 2026-03-03  
Commit de referencia: `b9c78bf`

## Resumo executivo

O projeto saiu de bootstrap para uma base funcional ampla: app Next.js (App Router + TypeScript), design system leve, navegação por universo, admin mínimo, integração Supabase, ingestão de PDFs, busca semântica com fallback, endpoint de perguntas com citações, timeline, trilhas/tutoria e automação CI/CD.  
O hardening inicial também foi aplicado (modo estrito no `/api/ask`, logs leves sem dados sensíveis e página `/status`).

Status geral: **MVP técnico funcional, com pendências de produto/segurança para produção pública**.

## Entregas consolidadas (0001 -> 0018)

- Fundação do app e estrutura de pastas: `app/`, `components/`, `lib/`, `styles/`, `docs/`, `tools/`, `reports/`.
- Rotas principais públicas do universo: hub, mapa, provas, linha, trilhas, debate, tutoria.
- Design system "Concreto Zen" com tokens CSS e componentes base de UI.
- UX de navegação reforçada: orientation bar, breadcrumb, quicknav, portais.
- Integração Supabase (cliente browser + server-only) e documentação de env.
- Supabase CLI com fluxo de migrations versionadas.
- Schema MVP com RLS base, seed inicial e evolução de migrations.
- Admin mínimo protegido por env (`ADMIN_MODE`), CRUD de universos/nós/docs.
- Upload de PDF para Storage (`cv-docs`) + registro em `documents`.
- Processamento server-side de PDF, chunking e status `uploaded/processed`.
- Busca vetorial com `pgvector`, RPC `match_chunks`, fallback textual.
- `/api/ask` com validação, rate limit simples, persistência em `qa_threads` + `citations`.
- UIs de Debate, Mapa, Provas, Trilhas, Tutoria, Linha.
- CI/CD GitHub Actions (`ci.yml` + `cd.yml`) com deploy Supabase + Vercel.
- Hardening: modo estrito no ask, `qa_logs`, sanitização de `ingest_logs`, `/status`.

## Estado por camada

## 1) Frontend / UX

- Implementado:
  - Tema visual consistente (alto contraste, tokens e componentes reutilizáveis).
  - Estrutura de navegação coerente entre telas do universo.
  - Placeholders evoluídos para fluxos reais (debate, provas, mapa, linha, trilhas, tutoria).
  - Melhorias de acessibilidade: foco visível, labels, ARIA em partes críticas.
- Pendente/recomendado:
  - Revisão final de contraste por ferramenta automatizada (Lighthouse/axe).
  - Padronização final de feedback de erro/sucesso em todas as telas de admin.

## 2) Backend / APIs / Server Actions

- Implementado:
  - `/api/ask` com validação, rate limiting por IP (in-memory), busca semântica + fallback textual.
  - Persistência de perguntas/citações.
  - Regra estrita: sem citação não há conclusão.
- Pendente/recomendado:
  - Rate limit distribuído (Redis/Upstash) para ambiente multi-instância.
  - Auditoria de erro mais padronizada (códigos internos por cenário).

## 3) Dados / Banco / Ingestão

- Implementado:
  - Migrations versionadas em `supabase/migrations/`.
  - Modelo core com universos, nós, arestas, documentos, chunks, evidências, trilhas, tutoria, Q&A, citações, eventos.
  - RLS base com leitura pública em universo publicado e escrita admin.
  - Pipeline de ingestão PDF sem OCR, chunking com configuração central.
  - `ingest_logs` e `qa_logs` sem conteúdo sensível.
- Pendente/recomendado:
  - Backfill e governança de embeddings em escala.
  - Estratégia de reprocessamento incremental por versão de chunking/embedding.

## 4) DevEx / Operação

- Implementado:
  - Scripts npm completos (`verify`, `db:*` etc.).
  - Documentação técnica: `ARCHITECTURE`, `DEV`, `UI`, `ENV`, `DB`, `DEPLOY`.
  - CI/CD com validação e deploy automatizado.
  - Página operacional `/status`.
- Pendente/recomendado:
  - Observabilidade externa (Sentry, métricas de latência, erro por rota).
  - Testes automatizados de integração (API + DB + RLS).

## Evidências de saúde atual

- Verificação local mais recente: `npm run verify` **OK** (lint + typecheck + build).
- Workflows presentes:
  - `.github/workflows/ci.yml`
  - `.github/workflows/cd.yml`
- Migrations presentes (core + evoluções até hardening):
  - `20260303235500_core_mvp.sql`
  - `20260304001000_documents_soft_delete.sql`
  - `20260304004000_ingest_logs.sql`
  - `20260304011500_vector_search.sql`
  - `20260304020000_events_timeline.sql`
  - `20260304024500_qa_logs_hardening.sql`

## Riscos e alertas

- Segredos enviados em conversa precisam ser tratados como **comprometidos** e rotacionados.
- `rate limit` em memória não protege adequadamente em escala horizontal.
- Área admin depende de `ADMIN_MODE`; para produção, ideal adicionar auth robusta (JWT/role).
- Há alta quantidade de mudanças locais não commitadas (snapshot atual: **69** entradas no `git status --short`), exigindo disciplina de revisão antes de release.

## Prioridades recomendadas (próximos passos)

1. Rotacionar imediatamente todas as credenciais sensíveis e revisar `.env.local`/secrets no provedor.
2. Consolidar commit(s) por domínio (hardening, status, docs) para reduzir risco de regressão.
3. Implementar autenticação/autorização real para `/admin` e ações de escrita.
4. Substituir rate limit in-memory por backend compartilhado.
5. Adicionar suíte mínima de testes de regressão para `/api/ask`, ingestão e rotas críticas.

## Como validar rapidamente agora

1. `npm run verify`
2. `npm run dev`
3. Acessar:
   - `/status`
   - `/c/universo-mvp`
   - `/c/universo-mvp/debate`
   - `/admin` (com `ADMIN_MODE=1`)

## Referências

- Sequência de relatórios: `reports/0001_bootstrap.md` até `reports/0018_hardening.md`
- Documentação técnica: `docs/ARCHITECTURE.md`, `docs/DEV.md`, `docs/ENV.md`, `docs/DB.md`, `docs/UI.md`, `docs/DEPLOY.md`
