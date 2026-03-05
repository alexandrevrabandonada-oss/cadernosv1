# Analytics de Produto

## Objetivo
- Medir funil e impacto por universo sem depender de GA/serviços externos.
- Cobrir navegação (`page_view`), CTAs (`cta_click`), share (`share_view`, `share_open_app`) e interação com objetos (`evidence_click`, `node_select`).

## O que coletamos
- `session_id` anônimo (`cv_sid`, cookie 30 dias).
- `user_id` quando logado.
- `universe_id`, `event_name`, `route`, `referrer_route`.
- `object_type/object_id` (quando aplicável) e `meta` curta (ex.: `cta`, `lens`).

## O que NÃO coletamos
- IP bruto.
- texto de perguntas do `/api/ask`.
- payloads sensíveis de sessão/auth.

## Endpoint
- `POST /api/track`
- payload:
```json
{
  "universeSlug": "poluicao-vr",
  "event_name": "cta_click",
  "route": "/c/poluicao-vr/mapa",
  "object_type": "node",
  "object_id": "uuid-opcional",
  "meta": { "cta": "ver_provas" }
}
```

## Session ID
- Implementação: `lib/analytics/session.ts`
- Cookie: `cv_sid`
- Geração: UUID aleatório.

## Dashboard
- Rota por universo: `/admin/universes/[id]/analytics`
  - últimas 24h: page views, share views, share open app, taxa.
  - últimos 7 dias: funil (hub→provas→debate→tutor→share), top nós/evidências, insufficient por nó.
- Resumo global: card no `/admin/status`.

## Privacidade e retenção
- Analytics usa dados operacionais mínimos e metadados curtos.
- Recomenda-se retenção por janela operacional (ex.: 90-180 dias) com limpeza periódica.
