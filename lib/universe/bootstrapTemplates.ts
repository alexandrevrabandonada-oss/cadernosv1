import type { SharedNotebookTemplateId } from '@/lib/shared-notebooks/templates';

export type UniverseBootstrapTemplateId = 'blank_minimal' | 'issue_investigation' | 'territorial_memory' | 'campaign_watch';

export type UniverseSeedNode = {
  slug: string;
  title: string;
  kind: 'concept' | 'event' | 'person' | 'question';
  summary: string;
  tags: string[];
};

export type UniverseSeedGlossary = {
  term: string;
  shortDef: string;
  body: string;
  tags: string[];
  nodeSlug?: string | null;
  questionPrompts?: string[];
};

export type UniverseSeedQuestion = {
  nodeSlug: string;
  question: string;
  pinRank?: number;
};

export type UniverseSeedTrailStep = {
  title: string;
  instruction: string;
  nodeSlug?: string | null;
  guidedQuestion?: string | null;
  requiresQuestion?: boolean;
};

export type UniverseSeedTrail = {
  slug: string;
  title: string;
  summary: string;
  isSystem?: boolean;
  steps: UniverseSeedTrailStep[];
};

export type UniverseBootstrapTemplate = {
  id: UniverseBootstrapTemplateId;
  label: string;
  description: string;
  titleHint: string;
  summaryHint: string;
  seedNodes: UniverseSeedNode[];
  seedGlossary: UniverseSeedGlossary[];
  seedQuestions: UniverseSeedQuestion[];
  seedTrails: UniverseSeedTrail[];
  seedCollectiveTemplates: SharedNotebookTemplateId[];
  opsDefaults: {
    isFeatured: boolean;
    featuredRank: number;
    focusOverride: boolean;
    focusNote: string | null;
  };
};

const CORE_TAGS = ['core'];

const templates: UniverseBootstrapTemplate[] = [
  {
    id: 'blank_minimal',
    label: 'Em branco',
    description: 'Estrutura minima para nascer com Hub, mapa e Comece Aqui sem carregar um recorte pronto.',
    titleHint: 'Novo universo',
    summaryHint: 'Universo em preparacao com estrutura minima para curadoria e leitura guiada.',
    seedNodes: [
      { slug: 'contexto', title: 'Contexto', kind: 'concept', summary: 'Panorama inicial do universo e do recorte de leitura.', tags: [...CORE_TAGS, 'contexto'] },
      { slug: 'pergunta-central', title: 'Pergunta central', kind: 'question', summary: 'Questao que organiza a leitura inicial deste universo.', tags: ['pergunta', 'entrada'] },
    ],
    seedGlossary: [
      { term: 'Recorte', shortDef: 'Enquadramento editorial inicial.', body: 'Define o ponto de partida do universo e evita que a leitura se disperse.', tags: ['base'], nodeSlug: 'contexto' },
    ],
    seedQuestions: [
      { nodeSlug: 'contexto', question: 'Qual e o recorte minimo necessario para orientar a leitura deste universo?', pinRank: 10 },
    ],
    seedTrails: [
      {
        slug: 'primeiros-passos',
        title: 'Primeiros passos',
        summary: 'Percurso curto para preparar o Hub e abrir a curadoria inicial.',
        steps: [
          { title: 'Defina o recorte', instruction: 'Reescreva o resumo do universo e anote o que este recorte precisa responder.', nodeSlug: 'contexto' },
          { title: 'Abra a pergunta central', instruction: 'Use a pergunta central como norte para os primeiros docs, provas e highlights.', nodeSlug: 'pergunta-central', guidedQuestion: 'O que este universo precisa tornar inteligivel primeiro?', requiresQuestion: true },
        ],
      },
    ],
    seedCollectiveTemplates: ['weekly_base'],
    opsDefaults: { isFeatured: false, featuredRank: 0, focusOverride: false, focusNote: null },
  },
  {
    id: 'issue_investigation',
    label: 'Investigacao de tema',
    description: 'Modelo operacional para poluicao, saude, trabalho, transporte e outros temas de investigacao.',
    titleHint: 'Investigacao em andamento',
    summaryHint: 'Universo criado para organizar contexto, atores, impactos, disputas e respostas de um tema em investigacao.',
    seedNodes: [
      { slug: 'contexto', title: 'Contexto', kind: 'concept', summary: 'Panorama do problema e do territorio.', tags: [...CORE_TAGS, 'contexto'] },
      { slug: 'atores', title: 'Atores', kind: 'person', summary: 'Instituicoes, empresas, coletivos e agentes envolvidos.', tags: [...CORE_TAGS, 'atores'] },
      { slug: 'impactos', title: 'Impactos', kind: 'concept', summary: 'Efeitos sociais, ambientais e materiais observados.', tags: [...CORE_TAGS, 'impactos'] },
      { slug: 'evidencias', title: 'Evidencias', kind: 'concept', summary: 'Base documental, provas e registros que sustentam a leitura.', tags: [...CORE_TAGS, 'evidencias'] },
      { slug: 'marcos', title: 'Marcos', kind: 'event', summary: 'Eventos, decisoes e inflexoes da linha do tempo.', tags: [...CORE_TAGS, 'marcos'] },
      { slug: 'disputas', title: 'Disputas', kind: 'concept', summary: 'Conflitos de narrativa, interesses e interpretacoes.', tags: [...CORE_TAGS, 'disputas'] },
      { slug: 'respostas', title: 'Respostas', kind: 'concept', summary: 'Acoes, politicas e saidas propostas ou em curso.', tags: [...CORE_TAGS, 'respostas'] },
    ],
    seedGlossary: [
      { term: 'Impacto', shortDef: 'Efeito observavel do problema investigado.', body: 'Use este termo para diferenciar sinais pontuais de efeitos recorrentes no territorio ou no grupo atingido.', tags: ['base', 'impactos'], nodeSlug: 'impactos' },
      { term: 'Disputa', shortDef: 'Conflito entre leituras, interesses ou agendas.', body: 'Ajuda a organizar controversias, omissoes e divergencias entre atores.', tags: ['base', 'disputas'], nodeSlug: 'disputas' },
      { term: 'Marco', shortDef: 'Momento que reorganiza o percurso do tema.', body: 'Pode ser um evento publico, decisao institucional ou descoberta documental.', tags: ['linha', 'base'], nodeSlug: 'marcos' },
    ],
    seedQuestions: [
      { nodeSlug: 'contexto', question: 'Como este problema se consolidou e por que importa agora?', pinRank: 10 },
      { nodeSlug: 'atores', question: 'Quem decide, quem executa e quem sofre os efeitos deste tema?', pinRank: 20 },
      { nodeSlug: 'impactos', question: 'Quais impactos ja aparecem de forma recorrente e verificavel?', pinRank: 30 },
      { nodeSlug: 'disputas', question: 'Quais narrativas entram em choque e o que cada uma omite?', pinRank: 40 },
    ],
    seedTrails: [
      {
        slug: 'comece-aqui-investigacao',
        title: 'Comece Aqui',
        summary: 'Percurso editorial para abrir o caso, mapear atores e localizar provas.',
        isSystem: true,
        steps: [
          { title: 'Abra o contexto', instruction: 'Leia o Hub e registre o problema central em duas frases.', nodeSlug: 'contexto' },
          { title: 'Mapeie atores', instruction: 'Liste os atores principais antes de acumular provas dispersas.', nodeSlug: 'atores' },
          { title: 'Localize impactos', instruction: 'Priorize os impactos recorrentes para guiar a leitura de docs e highlights.', nodeSlug: 'impactos' },
          { title: 'Entre nas disputas', instruction: 'Compare teses, lacunas e interesses que moldam a narrativa.', nodeSlug: 'disputas', guidedQuestion: 'Quais conflitos de leitura ainda precisam de prova?', requiresQuestion: true },
        ],
      },
    ],
    seedCollectiveTemplates: ['weekly_base', 'thematic_core', 'clipping'],
    opsDefaults: { isFeatured: false, featuredRank: 0, focusOverride: false, focusNote: null },
  },
  {
    id: 'territorial_memory',
    label: 'Memoria territorial',
    description: 'Modelo para memoria local, historia, cronologias e acervos de territorio.',
    titleHint: 'Memoria viva do territorio',
    summaryHint: 'Universo criado para organizar marcos, lugares, personagens e memorias de um territorio.',
    seedNodes: [
      { slug: 'territorio', title: 'Territorio', kind: 'concept', summary: 'Espaco, recorte e pertencimento que organizam o universo.', tags: [...CORE_TAGS, 'territorio'] },
      { slug: 'marcos-historicos', title: 'Marcos historicos', kind: 'event', summary: 'Sequencia de marcos e viradas do territorio.', tags: [...CORE_TAGS, 'linha', 'historia'] },
      { slug: 'atores-locais', title: 'Atores locais', kind: 'person', summary: 'Pessoas, grupos e instituicoes com papel recorrente.', tags: [...CORE_TAGS, 'atores'] },
      { slug: 'memorias', title: 'Memorias', kind: 'concept', summary: 'Narrativas, testemunhos e camadas de memoria coletiva.', tags: [...CORE_TAGS, 'memoria'] },
      { slug: 'conflitos', title: 'Conflitos', kind: 'concept', summary: 'Disputas materiais e simbolicas que atravessam o territorio.', tags: [...CORE_TAGS, 'conflitos'] },
    ],
    seedGlossary: [
      { term: 'Memoria territorial', shortDef: 'Camada viva de narrativas e registros de um lugar.', body: 'Ajuda a conectar documentos, testemunhos, marcos e disputas em torno de um territorio.', tags: ['memoria', 'territorio'], nodeSlug: 'memorias' },
      { term: 'Marco local', shortDef: 'Evento que reorganiza a vida do territorio.', body: 'Pode ser obra, conflito, politica publica, desastre ou conquista coletiva.', tags: ['linha'], nodeSlug: 'marcos-historicos' },
    ],
    seedQuestions: [
      { nodeSlug: 'territorio', question: 'Que recorte espacial e historico organiza este universo?', pinRank: 10 },
      { nodeSlug: 'memorias', question: 'Quais memorias aparecem, quem as guarda e quem fica de fora?', pinRank: 20 },
      { nodeSlug: 'conflitos', question: 'Quais disputas ajudam a entender o territorio hoje?', pinRank: 30 },
    ],
    seedTrails: [
      {
        slug: 'comece-aqui-territorio',
        title: 'Comece Aqui',
        summary: 'Percurso inicial para atravessar marcos, memorias e conflitos de um territorio.',
        isSystem: true,
        steps: [
          { title: 'Reconheca o territorio', instruction: 'Comece pelo recorte espacial e pelo resumo do universo.', nodeSlug: 'territorio' },
          { title: 'Percorra os marcos', instruction: 'Use a linha do tempo para localizar mudancas e inflexoes.', nodeSlug: 'marcos-historicos' },
          { title: 'Ouca as memorias', instruction: 'Reuna documentos, testemunhos e perguntas abertas.', nodeSlug: 'memorias', guidedQuestion: 'Que memoria precisa ser melhor documentada?', requiresQuestion: true },
        ],
      },
    ],
    seedCollectiveTemplates: ['study_group', 'thematic_core'],
    opsDefaults: { isFeatured: false, featuredRank: 0, focusOverride: false, focusNote: null },
  },
  {
    id: 'campaign_watch',
    label: 'Monitoramento continuo',
    description: 'Modelo para clipping, acompanhamento semanal e share pack editorial.',
    titleHint: 'Monitoramento em curso',
    summaryHint: 'Universo criado para acompanhar sinais, marcos e debates de forma recorrente.',
    seedNodes: [
      { slug: 'sinais', title: 'Sinais', kind: 'concept', summary: 'Alertas, sinais fracos e mudancas em curso.', tags: [...CORE_TAGS, 'sinais'] },
      { slug: 'agenda', title: 'Agenda', kind: 'event', summary: 'Calendario de marcos, atos e janelas de decisao.', tags: [...CORE_TAGS, 'agenda'] },
      { slug: 'debates', title: 'Debates', kind: 'concept', summary: 'Perguntas recorrentes e tensoes publicas do recorte.', tags: [...CORE_TAGS, 'debate'] },
      { slug: 'clipping-base', title: 'Clipping base', kind: 'concept', summary: 'Base de registros e links para acompanhamento continuo.', tags: [...CORE_TAGS, 'clipping'] },
    ],
    seedGlossary: [
      { term: 'Sinal quente', shortDef: 'Indicio que pede monitoramento imediato.', body: 'Use para itens com potencial de virar prova, evento ou trilho editorial rapido.', tags: ['monitoramento', 'urgencia'], nodeSlug: 'sinais' },
    ],
    seedQuestions: [
      { nodeSlug: 'sinais', question: 'Quais sinais justificam priorizacao esta semana?', pinRank: 10 },
      { nodeSlug: 'agenda', question: 'Que janela de decisao ou marco precisa ser acompanhado agora?', pinRank: 20 },
    ],
    seedTrails: [
      {
        slug: 'comece-aqui-monitoramento',
        title: 'Comece Aqui',
        summary: 'Percurso rapido para ligar clipping, agenda e debate recorrente.',
        isSystem: true,
        steps: [
          { title: 'Mapeie sinais', instruction: 'Abra o hub e separe o que e ruido do que exige monitoramento.', nodeSlug: 'sinais' },
          { title: 'Fixe a agenda', instruction: 'Localize marcos, prazos e eventos que puxam a semana.', nodeSlug: 'agenda' },
          { title: 'Suba para clipping', instruction: 'Transforme sinais em itens de clipping e review.', nodeSlug: 'clipping-base', guidedQuestion: 'O que merece entrar na base da semana?', requiresQuestion: true },
        ],
      },
    ],
    seedCollectiveTemplates: ['weekly_base', 'clipping'],
    opsDefaults: { isFeatured: false, featuredRank: 0, focusOverride: false, focusNote: null },
  },
];

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function listUniverseBootstrapTemplates() {
  return templates.map((template) => ({ ...template }));
}

export function getUniverseBootstrapTemplate(templateId?: string | null) {
  if (!templateId) return null;
  return templates.find((template) => template.id === templateId) ?? null;
}

export function applyUniverseBootstrapTemplate(
  template: UniverseBootstrapTemplate | null,
  overrides?: {
    title?: string | null;
    slug?: string | null;
    summary?: string | null;
  },
) {
  const title = overrides?.title?.trim() || template?.titleHint || 'Novo universo';
  return {
    title,
    slug: slugify(overrides?.slug?.trim() || title) || 'novo-universo',
    summary: overrides?.summary?.trim() || template?.summaryHint || 'Universo em preparacao.',
    templateId: template?.id ?? null,
    opsDefaults: template?.opsDefaults ?? {
      isFeatured: false,
      featuredRank: 0,
      focusOverride: false,
      focusNote: null,
    },
  };
}
