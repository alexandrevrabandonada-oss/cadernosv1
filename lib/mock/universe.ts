import { universeSections } from '@/lib/universeNav';

export type UniverseNode = {
  id: string;
  slug?: string;
  label: string;
  type: 'conceito' | 'evento' | 'pessoa' | 'evidencia';
  summary?: string;
  tags?: string[];
};

export type UniversePortal = {
  path: string;
  title: string;
  description: string;
  cta: string;
};

export type UniverseMock = {
  slug: string;
  title: string;
  summary: string;
  coreNodes: UniverseNode[];
  portals: UniversePortal[];
};

const portalDescriptions: Record<string, { description: string; cta: string }> = {
  mapa: {
    description: 'Visualize conexoes entre topicos, atores e fatos-chave.',
    cta: 'Abrir mapa',
  },
  provas: {
    description: 'Reuna evidencias, fontes e niveis de confianca.',
    cta: 'Ver provas',
  },
  'meu-caderno': {
    description: 'Reveja highlights e notas pessoais deste universo.',
    cta: 'Abrir meu caderno',
  },
  glossario: {
    description: 'Explore conceitos, siglas e entidades chave do universo.',
    cta: 'Abrir glossario',
  },
  linha: {
    description: 'Percorra a sequencia temporal do universo.',
    cta: 'Explorar linha',
  },
  trilhas: {
    description: 'Siga trilhas de estudo guiadas por objetivo.',
    cta: 'Acessar trilhas',
  },
  debate: {
    description: 'Contraponha argumentos e registre contrapontos.',
    cta: 'Entrar no debate',
  },
  tutor: {
    description: 'Inicie sessao guiada com pontos de conhecimento progressivos.',
    cta: 'Abrir tutor',
  },
  tutoria: {
    description: 'Defina acompanhamentos e proximos passos.',
    cta: 'Ir para tutoria',
  },
};

function normalizeLabel(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(' ');
}

export function getUniverseMock(slug: string): UniverseMock {
  const title = normalizeLabel(slug) || 'Universo Sem Nome';
  const base = title.toLowerCase();

  const coreNodes: UniverseNode[] = [
    {
      id: `${slug}-n1`,
      slug: 'conceito-central',
      label: `Conceito central de ${base}`,
      type: 'conceito',
      summary: 'Ponto de partida para a leitura do universo.',
      tags: ['base', 'conceito'],
    },
    {
      id: `${slug}-n2`,
      slug: 'evento-inicial',
      label: `Evento inicial documentado`,
      type: 'evento',
      summary: 'Marco cronologico inicial que aciona os desdobramentos.',
      tags: ['evento', 'linha'],
    },
    {
      id: `${slug}-n3`,
      slug: 'ator-principal',
      label: `Pessoa ou agente protagonista`,
      type: 'pessoa',
      summary: 'Agente com papel central na narrativa.',
      tags: ['ator', 'protagonista'],
    },
    {
      id: `${slug}-n4`,
      slug: 'evidencia-principal',
      label: `Primeira evidencia validada`,
      type: 'evidencia',
      summary: 'Trecho/arquivo que fundamenta a tese principal.',
      tags: ['evidencia', 'provas'],
    },
    {
      id: `${slug}-n5`,
      slug: 'ponto-virada',
      label: `Ponto de virada principal`,
      type: 'evento',
      summary: 'Momento de transicao na linha interpretativa.',
      tags: ['evento', 'virada'],
    },
    {
      id: `${slug}-n6`,
      slug: 'hipotese-aberta',
      label: `Hipotese critica em aberto`,
      type: 'conceito',
      summary: 'Questao ainda aberta para debate e validacao.',
      tags: ['hipotese', 'debate'],
    },
    {
      id: `${slug}-n7`,
      slug: 'fonte-secundaria',
      label: `Fonte secundaria de apoio`,
      type: 'evidencia',
      summary: 'Suporte complementar para triangulacao.',
      tags: ['fonte', 'apoio'],
    },
  ];

  const portals: UniversePortal[] = universeSections
    .filter((section) => section.path)
    .map((section) => {
      const meta = portalDescriptions[section.path];
      return {
        path: section.path,
        title: section.label,
        description: meta.description,
        cta: meta.cta,
      };
    });

  return {
    slug,
    title,
    summary: `${title} e um universo em construcao com estrutura de navegacao, nucleos tematicos e trilhas de exploracao.`,
    coreNodes,
    portals,
  };
}
