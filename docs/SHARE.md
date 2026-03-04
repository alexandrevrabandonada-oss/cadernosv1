# Share Pack

## Objetivo
Distribuir highlights e itens do universo com links publicos estaveis e OG cards padronizados.

## Endpoint OG
- Rota: `/api/og`
- Query:
  - `type=universe|evidence|thread|event|export|node|term`
  - `u=<slug-do-universo>`
  - `id=<id-do-item>` (obrigatorio para evidence/thread/event)

Exemplos:
- `/api/og?type=universe&u=poluicao-vr`
- `/api/og?type=evidence&u=poluicao-vr&id=<evidenceId>`
- `/api/og?type=thread&u=poluicao-vr&id=<threadId>`
- `/api/og?type=event&u=poluicao-vr&id=<eventId>`
- `/api/og?type=export&u=poluicao-vr&id=<exportId>`
- `/api/og?type=node&u=poluicao-vr&id=<nodeId>`
- `/api/og?type=term&u=poluicao-vr&id=<termId>`

## Paginas publicas de share
- Universo: `/c/[slug]/s`
- Evidencia: `/c/[slug]/s/evidence/[id]`
- Thread: `/c/[slug]/s/thread/[id]`
- Evento: `/c/[slug]/s/event/[id]`
- Export: `/c/[slug]/s/export/[id]`
- No do mapa: `/c/[slug]/s/node/[id]`
- Termo do glossario: `/c/[slug]/s/term/[id]`

Cada pagina:
- renderiza preview curto do item
- possui CTA `Abrir no app`
- inclui `og:image` apontando para `/api/og`

## Botao de compartilhamento
- Componente: `components/share/ShareButton.tsx`
- Comportamento:
  - usa Web Share API quando disponivel
  - fallback para copiar link (clipboard)
  - feedback via toast

## Gating e limites
- Share/OG publico somente para universo publicado.
- Para exports:
  - precisa `export.is_public=true`
  - e universo publicado
  - por padrao exports nascem privados.
- Snippets curtos para evitar vazamento de texto longo.
- Nao depende de fetch externo para renderizar imagem.

## Como publicar um dossie para share
1. Gerar export (thread/trilha/sessao).
2. No admin do universo, em `Exports do universo`, clicar `Tornar publico`.
3. Compartilhar o link canonico:
  - `/c/[slug]/s/export/[id]`

## Onde aparecem botoes de share
- Hub: destaques (evidencia/pergunta/evento).
- Provas/Linha/Debate: detalhe selecionado.
- Mapa: detalhe do no (`Compartilhar no`).
- Glossario: detalhe do termo (`Compartilhar termo`).
- Tutor done e tela de exports/admin para dossies.
