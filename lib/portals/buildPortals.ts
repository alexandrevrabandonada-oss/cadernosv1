import 'server-only';

import { serializeDebateFilters } from '@/lib/filters/debateFilters';
import { serializeGlossarioFilters } from '@/lib/filters/glossarioFilters';
import { serializeMapFilters } from '@/lib/filters/mapFilters';
import { serializeProvasFilters } from '@/lib/filters/provasFilters';
import { serializeTimelineFilters } from '@/lib/filters/timelineFilters';
import { buildUniverseHref } from '@/lib/universeNav';

export type PortalContext = {
  type: 'node' | 'tag' | 'event' | 'thread' | 'term' | 'trail' | 'tutor_session' | 'none';
  nodeSlug?: string;
  nodeTitle?: string;
  tags?: string[];
  docId?: string;
  threadId?: string;
  termSlug?: string;
  trailId?: string;
  sessionId?: string;
  year?: number | null;
};

export type ContextPortal = {
  id: string;
  label: string;
  description: string;
  href: string;
  badge?: string;
};

function withQuery(base: string, query: string) {
  return query ? `${base}?${query}` : base;
}

function uniqueTags(tags?: string[]) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 4);
}

export function buildPortals(input: { universeSlug: string; context: PortalContext }): ContextPortal[] {
  const { universeSlug, context } = input;
  const portals: ContextPortal[] = [];
  const add = (portal: ContextPortal) => {
    if (!portals.some((item) => item.id === portal.id)) portals.push(portal);
  };
  const provasBase = buildUniverseHref(universeSlug, 'provas');
  const linhaBase = buildUniverseHref(universeSlug, 'linha');
  const debateBase = buildUniverseHref(universeSlug, 'debate');
  const mapaBase = buildUniverseHref(universeSlug, 'mapa');
  const glossarioBase = buildUniverseHref(universeSlug, 'glossario');
  const trilhasBase = buildUniverseHref(universeSlug, 'trilhas');
  const tutorBase = buildUniverseHref(universeSlug, 'tutor');
  const tags = uniqueTags(context.tags);
  const nodeBadge = context.nodeSlug ? `No:${context.nodeSlug}` : undefined;
  const tagBadge = tags.length > 0 ? `Tag:${tags[0]}` : undefined;
  const docBadge = context.docId ? 'Doc relacionado' : undefined;

  switch (context.type) {
    case 'node': {
      const nodeSlug = context.nodeSlug ?? '';
      add({
        id: 'provas',
        label: 'Provas',
        description: 'Ver evidencias ligadas ao no selecionado.',
        href: withQuery(
          provasBase,
          serializeProvasFilters({ node: nodeSlug, tags, selected: '', panel: '', cursor: 0 }),
        ),
        badge: nodeBadge,
      });
      add({
        id: 'linha',
        label: 'Linha',
        description: 'Ver eventos com contexto do mesmo no.',
        href: withQuery(
          linhaBase,
          serializeTimelineFilters({ node: nodeSlug, tags, selected: '', panel: '', cursor: 0 }),
        ),
        badge: nodeBadge,
      });
      add({
        id: 'debate',
        label: 'Debate',
        description: 'Perguntas conclusivas para o mesmo no.',
        href: withQuery(
          debateBase,
          serializeDebateFilters({ node: nodeSlug, status: 'strict_ok', selected: '', panel: '', cursor: 0 }),
        ),
        badge: nodeBadge,
      });
      add({
        id: 'mapa',
        label: 'Mapa',
        description: 'Voltar ao mapa com este no destacado.',
        href: withQuery(mapaBase, serializeMapFilters({ node: nodeSlug, panel: 'detail' })),
        badge: nodeBadge,
      });
      add({
        id: 'glossario',
        label: 'Glossario',
        description: 'Termos e conceitos ligados a este no.',
        href: withQuery(glossarioBase, serializeGlossarioFilters({ q: context.nodeTitle ?? nodeSlug })),
      });
      add({
        id: 'tutor',
        label: 'Tutor',
        description: 'Continuar estudo guiado com este contexto.',
        href: tutorBase,
      });
      break;
    }
    case 'tag': {
      add({
        id: 'provas',
        label: 'Provas',
        description: 'Abrir evidencias filtradas por tag.',
        href: withQuery(provasBase, serializeProvasFilters({ tags, selected: '', panel: '', cursor: 0 })),
        badge: tagBadge,
      });
      add({
        id: 'linha',
        label: 'Linha',
        description: 'Eventos relacionados a esta tag.',
        href: withQuery(linhaBase, serializeTimelineFilters({ tags, selected: '', panel: '', cursor: 0 })),
        badge: tagBadge,
      });
      add({
        id: 'debate',
        label: 'Debate',
        description: 'Threads buscando o tema da tag.',
        href: withQuery(debateBase, serializeDebateFilters({ q: tags[0] ?? '', selected: '', panel: '', cursor: 0 })),
        badge: tagBadge,
      });
      add({
        id: 'glossario',
        label: 'Glossario',
        description: 'Conceitos conectados a esta tag.',
        href: withQuery(glossarioBase, serializeGlossarioFilters({ tags })),
        badge: tagBadge,
      });
      break;
    }
    case 'event': {
      add({
        id: 'provas',
        label: 'Provas',
        description: 'Checar evidencias do evento e documento relacionado.',
        href: withQuery(
          provasBase,
          serializeProvasFilters({
            node: context.nodeSlug ?? '',
            tags,
            relatedTo: context.docId ?? '',
            yearFrom: context.year ?? null,
            yearTo: context.year ?? null,
            selected: '',
            panel: '',
            cursor: 0,
          }),
        ),
        badge: context.nodeSlug ? nodeBadge : docBadge,
      });
      add({
        id: 'mapa',
        label: 'Mapa',
        description: 'Localizar o no associado no explorer.',
        href: withQuery(mapaBase, serializeMapFilters({ node: context.nodeSlug ?? '', panel: 'detail' })),
        badge: nodeBadge,
      });
      add({
        id: 'debate',
        label: 'Debate',
        description: 'Debater impactos e implicacoes do evento.',
        href: withQuery(
          debateBase,
          serializeDebateFilters({
            node: context.nodeSlug ?? '',
            lens: 'policy',
            q: tags[0] ?? '',
            selected: '',
            panel: '',
            cursor: 0,
          }),
        ),
      });
      break;
    }
    case 'thread': {
      add({
        id: 'provas',
        label: 'Provas',
        description: 'Revisar base que sustentou esta resposta.',
        href: withQuery(
          provasBase,
          serializeProvasFilters({
            node: context.nodeSlug ?? '',
            relatedTo: context.docId ?? '',
            tags,
            selected: '',
            panel: '',
            cursor: 0,
          }),
        ),
        badge: context.nodeSlug ? nodeBadge : docBadge,
      });
      add({
        id: 'linha',
        label: 'Linha',
        description: 'Cruzar esta thread com eventos da linha do tempo.',
        href: withQuery(
          linhaBase,
          serializeTimelineFilters({
            node: context.nodeSlug ?? '',
            tags,
            selected: '',
            panel: '',
            cursor: 0,
          }),
        ),
      });
      add({
        id: 'mapa',
        label: 'Mapa',
        description: 'Abrir no central desta discussao.',
        href: withQuery(mapaBase, serializeMapFilters({ node: context.nodeSlug ?? '', panel: 'detail' })),
      });
      add({
        id: 'tutor',
        label: 'Tutor',
        description: 'Levar o tema da thread para estudo guiado.',
        href: tutorBase,
      });
      break;
    }
    case 'term': {
      add({
        id: 'mapa',
        label: 'Mapa',
        description: 'Explorar o no ligado a este termo.',
        href: withQuery(mapaBase, serializeMapFilters({ node: context.nodeSlug ?? '', panel: 'detail' })),
        badge: context.nodeSlug ? nodeBadge : undefined,
      });
      add({
        id: 'provas',
        label: 'Provas',
        description: 'Abrir evidencias relacionadas ao termo.',
        href: withQuery(
          provasBase,
          serializeProvasFilters({ node: context.nodeSlug ?? '', tags, selected: '', panel: '', cursor: 0 }),
        ),
        badge: tagBadge,
      });
      add({
        id: 'debate',
        label: 'Debate',
        description: 'Perguntar ao universo sobre este conceito.',
        href: withQuery(
          debateBase,
          serializeDebateFilters({ node: context.nodeSlug ?? '', q: context.nodeTitle ?? '', selected: '', panel: '', cursor: 0 }),
        ),
      });
      add({
        id: 'linha',
        label: 'Linha',
        description: 'Eventos conectados ao termo e tags.',
        href: withQuery(linhaBase, serializeTimelineFilters({ node: context.nodeSlug ?? '', tags, selected: '', panel: '', cursor: 0 })),
      });
      break;
    }
    case 'trail': {
      add({
        id: 'tutor',
        label: 'Tutor',
        description: 'Abrir sessao de tutor para aprofundar a trilha.',
        href: tutorBase,
        badge: context.trailId ? 'Trilha ativa' : undefined,
      });
      add({
        id: 'provas',
        label: 'Provas',
        description: 'Evidencias para o passo atual.',
        href: withQuery(provasBase, serializeProvasFilters({ node: context.nodeSlug ?? '', tags, selected: '', panel: '', cursor: 0 })),
      });
      add({
        id: 'linha',
        label: 'Linha',
        description: 'Eventos para complementar o passo atual.',
        href: withQuery(linhaBase, serializeTimelineFilters({ node: context.nodeSlug ?? '', tags, selected: '', panel: '', cursor: 0 })),
      });
      add({
        id: 'debate',
        label: 'Debate',
        description: 'Perguntas para testar o entendimento do passo.',
        href: withQuery(debateBase, serializeDebateFilters({ node: context.nodeSlug ?? '', status: 'strict_ok', selected: '', panel: '', cursor: 0 })),
      });
      break;
    }
    case 'tutor_session': {
      add({
        id: 'trilhas',
        label: 'Trilhas',
        description: 'Continuar jornada com trilhas relacionadas.',
        href: withQuery(trilhasBase, context.trailId ? `trail=${encodeURIComponent(context.trailId)}&mode=player` : ''),
      });
      add({
        id: 'provas',
        label: 'Provas',
        description: 'Revisar evidencias das conclusoes da sessao.',
        href: withQuery(provasBase, serializeProvasFilters({ node: context.nodeSlug ?? '', tags, selected: '', panel: '', cursor: 0 })),
      });
      add({
        id: 'mapa',
        label: 'Mapa',
        description: 'Retomar o no principal no explorer.',
        href: withQuery(mapaBase, serializeMapFilters({ node: context.nodeSlug ?? '', panel: 'detail' })),
      });
      add({
        id: 'debate',
        label: 'Debate',
        description: 'Abrir follow-ups com base no que foi aprendido.',
        href: withQuery(debateBase, serializeDebateFilters({ node: context.nodeSlug ?? '', status: 'strict_ok', selected: '', panel: '', cursor: 0 })),
      });
      break;
    }
    case 'none':
    default: {
      add({
        id: 'destaques',
        label: 'Destaques',
        description: 'Ir para o kit de vitrine no Hub do universo.',
        href: `${buildUniverseHref(universeSlug, '')}#destaques`,
      });
      add({
        id: 'mapa',
        label: 'Mapa',
        description: 'Explorar os nos centrais do universo.',
        href: mapaBase,
      });
      add({
        id: 'provas',
        label: 'Provas',
        description: 'Entrar pelas evidencias curadas.',
        href: provasBase,
      });
      add({
        id: 'linha',
        label: 'Linha',
        description: 'Seguir a narrativa temporal dos eventos.',
        href: linhaBase,
      });
      add({
        id: 'debate',
        label: 'Debate',
        description: 'Fazer perguntas e obter respostas com citacoes.',
        href: debateBase,
      });
      add({
        id: 'glossario',
        label: 'Glossario',
        description: 'Navegar por conceitos e termos do universo.',
        href: glossarioBase,
      });
      add({
        id: 'trilhas',
        label: 'Trilhas',
        description: 'Seguir percursos guiados de estudo.',
        href: withQuery(trilhasBase, 'trail=comece-aqui&mode=player&step=1'),
      });
      add({
        id: 'tutor',
        label: 'Tutor',
        description: 'Iniciar sessao de aprendizagem ponto a ponto.',
        href: tutorBase,
      });
      break;
    }
  }

  return portals.slice(0, 8);
}
