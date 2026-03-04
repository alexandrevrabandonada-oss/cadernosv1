# Estado da Nação — Cadernos Vivos
Data: 2026-03-04
Commit (se possível): n/a

## 1) O que mudou neste tijolo
- Share pack expandido para **conceitos do universo**:
  - compartilhamento de **nó** (mapa)
  - compartilhamento de **termo** (glossário)
- `/api/og` agora suporta:
  - `type=node`
  - `type=term`
- Novas páginas públicas de share:
  - `/c/[slug]/s/node/[id]`
  - `/c/[slug]/s/term/[id]`
- `lib/share/content.ts` evoluído com:
  - `getShareNode(slug, id)`
  - `getShareTerm(slug, id)`
  - preview curto + evidências + perguntas + fallback `TEST_SEED=1`
- Botões de share adicionados em:
  - detalhe do Mapa (`Compartilhar no`)
  - detalhe do Glossário (`Compartilhar termo`)
- Documentação de share atualizada.

## 2) Rotas
- OG:
  - `/api/og?type=node&u=<slug>&id=<nodeId>`
  - `/api/og?type=term&u=<slug>&id=<termId>`
- Share pages:
  - `/c/[slug]/s/node/[id]`
  - `/c/[slug]/s/term/[id]`

## 3) Dados e DB (Supabase)
- Sem migration nova neste tijolo.
- Reuso de tabelas existentes:
  - `nodes`, `node_evidences`, `node_questions`
  - `glossary_terms`
  - `evidences`
  - `universes` (gating por publicado)
- Gating:
  - share/OG de node/term só responde para universo publicado.

## 4) APIs / Jobs
- API alterada:
  - [app/api/og/route.tsx](c:/Projetos/Cadernos%20Vivos%20V1/app/api/og/route.tsx)
- Data layer de share:
  - [lib/share/content.ts](c:/Projetos/Cadernos%20Vivos%20V1/lib/share/content.ts)
- Sem novos jobs/workers.

## 5) UI/UX
- Página de share de nó:
  - headline + snippet
  - 2–3 evidências em destaque
  - 2 perguntas sugeridas
  - CTAs: Abrir no app, Provas, Debate, Linha, Tutor, Compartilhar
- Página de share de termo:
  - headline + snippet
  - evidências e perguntas sugeridas
  - CTAs equivalentes
- Integrações de botão:
  - [app/c/[slug]/mapa/page.tsx](c:/Projetos/Cadernos%20Vivos%20V1/app/c/%5Bslug%5D/mapa/page.tsx)
  - [app/c/[slug]/glossario/page.tsx](c:/Projetos/Cadernos%20Vivos%20V1/app/c/%5Bslug%5D/glossario/page.tsx)

## 6) Segurança
- Sem fetch externo para OG.
- Snippets curtos para não vazar conteúdo longo.
- Share canônico em `/c/[slug]/s/node/[id]` e `/c/[slug]/s/term/[id]`.

## 7) Como testar (passo a passo)
1. Abrir `/c/demo/mapa`, selecionar um nó e clicar `Compartilhar no`.
2. Abrir `/c/demo/glossario`, selecionar um termo e clicar `Compartilhar termo`.
3. Abrir share pages:
   - `/c/demo/s/node/demo-n1`
   - `/c/demo/s/term/mock-demo-demo-n1`
4. Validar CTAs e preview.
5. Testar OG:
   - `/api/og?type=node&u=demo&id=demo-n1`
   - `/api/og?type=term&u=demo&id=mock-demo-demo-n1`

## 8) Pendências e próximos passos
1. Opcional: criar índices curtos `/c/[slug]/s/node` e `/c/[slug]/s/term`.
2. Opcional: adicionar `metadataBase` global para remover warning de OG em ambiente local/CI.
3. Opcional: ampliar share de term para múltiplos termos relacionados.

✅ Verify passou
- Comando: `npm run verify`

✅ E2E passou
- Comando: `npm run test:e2e:ci`
- Resultado: `21 passed`

✅ Visual passou
- Comando: `npm run test:ui:ci`
- Resultado: `4 passed`
