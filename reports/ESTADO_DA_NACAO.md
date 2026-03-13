# Estado da Nacao - Cadernos Vivos
Data: 2026-03-12
Atualizado em: 2026-03-12 23:32:00 -03:00
Contexto consolidado: VIZ-24 - Naming + Information Architecture Pass
Commit de referencia: 2ac35c3

## 1) Resumo executivo
- A base de interface entrou em um passe semantico: menos labels herdadas de desenvolvimento e mais linguagem de produto editorial.
- `Universo` foi reforcado como o todo, enquanto `Hub` foi fixado como a entrada editorial desse todo.
- A navegacao local do universo ganhou agrupamento semantico discreto em `Exploracao`, `Estudo` e `Coletivo`.
- `Tutor` foi consolidado como nome publico unico; `Tutoria` ficou relegado a termo legado e interno.
- No admin, a linguagem visivel ficou menos proxima de kanban de software e mais proxima de operacao editorial.

## 2) O que mudou em naming e IA
### Produto publico
- Home passou a falar em `Universos em destaque`, `Abrir universo` e `Comecar com Tutor` com mais consistencia.
- Hub reforca a leitura de `Hub editorial` como porta de entrada do universo.
- Breadcrumbs agora deixam mais clara a diferenca entre `Universo` e a sala atual.
- CTAs foram limpos para privilegiar verbos padrao como `Abrir`, `Explorar`, `Comecar`, `Voltar ao Hub`, `Salvar`, `Adicionar`, `Exportar` e `Publicar`.

### Navegacao local
- As salas principais continuam planas, mas agora respondem a uma taxonomia explicita:
  - `Exploracao`: Hub, Mapa, Provas, Debate, Linha, Glossario
  - `Estudo`: Trilhas, Tutor, Meu Caderno
  - `Coletivo`: Coletivos
- Essa leitura entrou em [UniverseLocalNav.tsx](C:/Projetos/Cadernos%20Vivos%20V1/components/universe/UniverseLocalNav.tsx) e [lib/universeNav.ts](C:/Projetos/Cadernos%20Vivos%20V1/lib/universeNav.ts).

### Rail contextual
- A rail lateral ficou mais humana e menos tecnica.
- Labels como `Explorar o mapa`, `Acervo de provas`, `Levar ao coletivo` e `Comecar pela trilha` substituem rotulos mais mecanicos.
- O caderno ganhou fluxo mais claro e sem colisao de CTA com `Retomar` no recap.

## 3) Decisao sobre Tutor e Tutoria
- `Tutor` e o nome publico unico do produto.
- A rota legada `/tutoria` continua existindo, mas a orientacao visual e a copy agora apontam para `Tutor`.
- A decisao evita duas entradas quase iguais na navegacao e reduz atrito cognitivo para usuario final.

## 4) Admin e operacao editorial
### Labels refinados
- `Universe Inbox` virou `Inbox documental` na linguagem visivel principal do admin.
- `Featured / Focus` passou a orbitar `Vitrine editorial` como guarda-chuva semantico.
- O board editorial passou a exibir etapas visiveis em portugues:
  - `Estrutura`
  - `Ingestao`
  - `Qualidade`
  - `Curadoria`
  - `Revisao`
  - `Vitrine`
  - `Publicacao`
  - `Concluido`

### Resultado
- O cockpit `/admin/universes` comunica melhor as tres portas de criacao.
- O board `/admin/programa-editorial/[slug]` deixa mais legivel a diferenca entre etapa atual e etapa sugerida.
- O Inbox ficou semanticamente alinhado ao resto do produto, sem perder a leitura operacional.

## 5) Docs atualizadas
- [UI.md](C:/Projetos/Cadernos%20Vivos%20V1/docs/UI.md)
- [PROGRAMA_EDITORIAL.md](C:/Projetos/Cadernos%20Vivos%20V1/docs/PROGRAMA_EDITORIAL.md)
- [CATALOGO.md](C:/Projetos/Cadernos%20Vivos%20V1/docs/CATALOGO.md)
- [IA_NAMING.md](C:/Projetos/Cadernos%20Vivos%20V1/docs/IA_NAMING.md)

## 6) Como testar
1. Abrir Hub, Mapa e Meu Caderno e revisar os novos nomes nas tabs, breadcrumbs, rail contextual e CTAs.
2. Validar na navegacao local os grupos semanticos `Exploracao`, `Estudo` e `Coletivo`.
3. Abrir `/admin/universes`, `/admin/universes/inbox` e `/admin/programa-editorial` para revisar a linguagem nova do admin.
4. Confirmar que `Tutor` aparece como nome publico e `Tutoria` nao concorre mais como entrada principal.
5. Checar no board a leitura `etapa atual` x `etapa sugerida` e os novos nomes das lanes.

## 7) Arquivos centrais desta entrega
- [UniverseLocalNav.tsx](C:/Projetos/Cadernos%20Vivos%20V1/components/universe/UniverseLocalNav.tsx)
- [OrientationBar.tsx](C:/Projetos/Cadernos%20Vivos%20V1/components/universe/OrientationBar.tsx)
- [ContextRail.tsx](C:/Projetos/Cadernos%20Vivos%20V1/components/workspace/ContextRail.tsx)
- [SectionActionBar.tsx](C:/Projetos/Cadernos%20Vivos%20V1/components/workspace/SectionActionBar.tsx)
- [universeNav.ts](C:/Projetos/Cadernos%20Vivos%20V1/lib/universeNav.ts)
- [page.tsx](C:/Projetos/Cadernos%20Vivos%20V1/app/page.tsx)
- [page.tsx](C:/Projetos/Cadernos%20Vivos%20V1/app/c/%5Bslug%5D/page.tsx)
- [page.tsx](C:/Projetos/Cadernos%20Vivos%20V1/app/admin/universes/page.tsx)
- [page.tsx](C:/Projetos/Cadernos%20Vivos%20V1/app/admin/universes/inbox/page.tsx)
- [page.tsx](C:/Projetos/Cadernos%20Vivos%20V1/app/admin/programa-editorial/%5Bslug%5D/page.tsx)
- [program.ts](C:/Projetos/Cadernos%20Vivos%20V1/lib/editorial/program.ts)
- [workspace.css](C:/Projetos/Cadernos%20Vivos%20V1/styles/workspace.css)

## 8) Verificacao final
- ✅ `npm run verify` passou
- ✅ `npm run test:e2e:ci` passou
- ✅ `npm run test:ui:ci` passou

## 9) Observacoes operacionais
- O E2E terminou verde com 1 flaky antigo fora do escopo semantico desta entrega: bootstrap/checklist do admin.
- Os snapshots visuais foram regenerados para refletir a nova linguagem e a reorganizacao semantica da interface.
- A base agora esta mais pronta para refinamentos editoriais finos sem voltar a vazar termos de implementacao para a experiencia publica.
