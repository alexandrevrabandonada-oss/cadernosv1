import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DEMO_SLUG = 'poluicao-vr';
const DEMO_TITLE = 'Poluicao em Volta Redonda';
const DEMO_SUMMARY =
  'Universo demonstrativo sobre poluicao industrial e seus impactos em ar, solo, agua, saude e justica ambiental no territorio de Volta Redonda.';

const CORE_NODES = [
  {
    slug: 'ar-po-preto',
    title: 'Ar (Po Preto)',
    kind: 'concept',
    summary: 'Material particulado sedimentavel e episodios de po preto em bairros urbanos.',
    tags: ['core', 'ar', 'po-preto', 'particulado'],
  },
  {
    slug: 'solo-metais-escoria',
    title: 'Solo (Metais e Escoria)',
    kind: 'concept',
    summary: 'Deposicao de escoria e metais em superficies urbanas e pontos de solo.',
    tags: ['core', 'solo', 'metais', 'escoria'],
  },
  {
    slug: 'agua-paraiba-do-sul',
    title: 'Agua (Paraiba do Sul)',
    kind: 'concept',
    summary: 'Pressao sobre recursos hidricos, drenagem e qualidade da agua.',
    tags: ['core', 'agua', 'hidrico', 'paraiba-do-sul'],
  },
  {
    slug: 'saude-respiratoria-infantil',
    title: 'Saude (Respiratoria e Infantil)',
    kind: 'concept',
    summary: 'Desfechos respiratorios, internacoes e efeitos em grupos sensiveis.',
    tags: ['core', 'saude', 'respiratorio', 'infantil'],
  },
  {
    slug: 'fontes-emissoras-processos',
    title: 'Fontes Emissoras',
    kind: 'concept',
    summary: 'Processos industriais, pátios de escoria, vias e pontos de emissao difusa.',
    tags: ['core', 'fontes', 'emissao', 'processo-industrial'],
  },
  {
    slug: 'monitoramento-metricas-sensores',
    title: 'Monitoramento',
    kind: 'concept',
    summary: 'Indicadores, sensores, estacoes e lacunas de monitoramento territorial.',
    tags: ['core', 'monitoramento', 'metricas', 'sensores'],
  },
  {
    slug: 'politica-tacs-governanca',
    title: 'Politica e TACs',
    kind: 'concept',
    summary: 'Acordos, compliance ambiental, licenciamento e governanca institucional.',
    tags: ['core', 'politica', 'tac', 'governanca'],
  },
  {
    slug: 'trabalho-risco-impacto',
    title: 'Trabalho e Risco',
    kind: 'concept',
    summary: 'Riscos ocupacionais, terceirizacao, fechamento e impactos socioeconomicos.',
    tags: ['core', 'trabalho', 'risco-ocupacional'],
  },
  {
    slug: 'justica-ambiental-territorio',
    title: 'Justica Ambiental',
    kind: 'concept',
    summary: 'Distribuicao desigual de danos, vulnerabilidade territorial e reparacao.',
    tags: ['core', 'justica-ambiental', 'territorio'],
  },
];

const SECONDARY_NODES = [
  ['metais-pesados', 'Metais Pesados', 'concept', ['metais', 'toxicologia']],
  ['pm25-pm10', 'PM2.5 e PM10', 'concept', ['particulado', 'pm25', 'pm10']],
  ['escoria-industrial', 'Escoria Industrial', 'concept', ['escoria', 'residuo']],
  ['deposicao-atmosferica', 'Deposicao Atmosferica', 'concept', ['ar', 'deposicao']],
  ['ilhas-de-calor', 'Ilhas de Calor', 'concept', ['clima', 'temperatura']],
  ['anomalias-termicas', 'Anomalias Termicas', 'event', ['termico', 'monitoramento']],
  ['subnotificacao', 'Subnotificacao em Saude', 'concept', ['saude', 'dados']],
  ['terceirizacao-risco', 'Terceirizacao e Risco', 'concept', ['trabalho', 'terceirizacao']],
  ['monitoramento-cidadao', 'Monitoramento Cidadao', 'concept', ['participacao', 'monitoramento']],
  ['comunicacao-risco', 'Comunicacao de Risco', 'concept', ['risco', 'governanca']],
  ['licenciamento-ambiental', 'Licenciamento Ambiental', 'concept', ['politica', 'licenciamento']],
  ['fiscalizacao', 'Fiscalizacao e Controle', 'event', ['politica', 'controle']],
  ['custos-sociais', 'Custos Sociais da Poluicao', 'concept', ['economia', 'saude']],
  ['bioindicadores', 'Bioindicadores', 'concept', ['monitoramento', 'saude']],
  ['riscos-hidricos', 'Riscos Hidricos', 'concept', ['agua', 'hidrico']],
  ['rede-atencao-basica', 'Atencao Basica e Territorio', 'person', ['saude', 'territorio']],
];

const EDGE_RULES = [
  ['fontes-emissoras-processos', 'ar-po-preto', 'pressiona'],
  ['fontes-emissoras-processos', 'solo-metais-escoria', 'contamina'],
  ['fontes-emissoras-processos', 'agua-paraiba-do-sul', 'afeta'],
  ['ar-po-preto', 'saude-respiratoria-infantil', 'correlaciona'],
  ['solo-metais-escoria', 'saude-respiratoria-infantil', 'contribui'],
  ['agua-paraiba-do-sul', 'saude-respiratoria-infantil', 'implica'],
  ['monitoramento-metricas-sensores', 'ar-po-preto', 'mede'],
  ['monitoramento-metricas-sensores', 'solo-metais-escoria', 'mede'],
  ['monitoramento-metricas-sensores', 'agua-paraiba-do-sul', 'mede'],
  ['politica-tacs-governanca', 'monitoramento-metricas-sensores', 'regula'],
  ['politica-tacs-governanca', 'fontes-emissoras-processos', 'controla'],
  ['trabalho-risco-impacto', 'saude-respiratoria-infantil', 'relaciona'],
  ['justica-ambiental-territorio', 'politica-tacs-governanca', 'pressiona'],
  ['justica-ambiental-territorio', 'saude-respiratoria-infantil', 'prioriza'],
  ['pm25-pm10', 'ar-po-preto', 'detalha'],
  ['escoria-industrial', 'solo-metais-escoria', 'origina'],
  ['riscos-hidricos', 'agua-paraiba-do-sul', 'detalha'],
  ['subnotificacao', 'saude-respiratoria-infantil', 'obscurece'],
  ['monitoramento-cidadao', 'monitoramento-metricas-sensores', 'complementa'],
  ['licenciamento-ambiental', 'politica-tacs-governanca', 'instrumentaliza'],
];

const GLOSSARY_TERMS = [
  ['po-preto', 'Po preto', 'Material sedimentavel visivel em superficies urbanas.'],
  ['pm25', 'PM2.5', 'Particulas inalaveis finas com alto potencial de impacto em saude.'],
  ['pm10', 'PM10', 'Particulas inalaveis grossas monitoradas em redes de qualidade do ar.'],
  ['metais-pesados', 'Metais pesados', 'Elementos com potencial toxicologico em ar, solo e agua.'],
  ['escoria', 'Escoria', 'Residuo de processo metalurgico com potencial de dispersao ambiental.'],
  ['deposicao-atmosferica', 'Deposicao atmosferica', 'Acumulo de particulas e compostos na superficie.'],
  ['tac', 'TAC', 'Termo de Ajustamento de Conduta entre atores institucionais.'],
  ['justica-ambiental', 'Justica ambiental', 'Debate sobre distribuicao desigual de danos ambientais.'],
  ['risco-hidrico', 'Risco hidrico', 'Probabilidade de dano relacionado a qualidade/disponibilidade de agua.'],
  ['bioindicador', 'Bioindicador', 'Sinal biologico utilizado para inferir qualidade ambiental.'],
  ['subnotificacao', 'Subnotificacao', 'Registro incompleto de casos e efeitos em saude.'],
  ['terceirizacao', 'Terceirizacao', 'Modelo de contratacao com implicacoes para exposicao e seguranca.'],
  ['ilha-de-calor', 'Ilha de calor', 'Area urbana com temperatura superior ao entorno.'],
  ['compliance-ambiental', 'Compliance ambiental', 'Conjunto de rotinas para cumprir regras ambientais.'],
  ['monitoramento-cidadao', 'Monitoramento cidadao', 'Coleta participativa de dados ambientais pela comunidade.'],
  ['licenciamento', 'Licenciamento ambiental', 'Processo administrativo para autorizacao e controle de atividades.'],
];

const EVENTS = [
  ['1994-01-01', 'event', 'Primeiros registros comunitarios de po preto', 'Relatos de deposicao em bairros proximos ao parque industrial.'],
  ['1998-06-01', 'report', 'Relatorio local sobre particulados', 'Documento tecnico preliminar sobre qualidade do ar.'],
  ['2001-03-15', 'law', 'Marco regulatorio municipal de controle', 'Ato municipal para reforco de monitoramento e fiscalizacao.'],
  ['2004-08-01', 'event', 'Debate publico sobre escoria e solo', 'Audiencias com foco em escoria e pontos de deposito.'],
  ['2007-05-10', 'report', 'Atualizacao tecnica de risco hidrico', 'Analise preliminar sobre drenagem e qualidade da agua.'],
  ['2009-11-20', 'event', 'Amplificacao de monitoramento local', 'Novos pontos de coleta em territorio urbano.'],
  ['2011-02-12', 'news', 'Cobertura regional sobre saude respiratoria', 'Destaque para sazonalidade de sintomas respiratorios.'],
  ['2012-09-18', 'law', 'Revisao de protocolos de fiscalizacao', 'Fortalecimento de ritos administrativos de controle.'],
  ['2014-04-03', 'report', 'Serie historica de qualidade do ar', 'Consolidacao de indicadores de particulados e variacao temporal.'],
  ['2015-10-21', 'event', 'Reuniao interinstitucional sobre TACs', 'Atores publicos e privados negociam parametros de controle.'],
  ['2016-07-14', 'news', 'Comunicacao de risco em bairros vulneraveis', 'Aumento da pressao por transparencia de dados.'],
  ['2017-12-05', 'report', 'Levantamento de metais em solo urbano', 'Indicadores de metais em pontos de interesse territorial.'],
  ['2018-06-28', 'event', 'Rede cidada de monitoramento inicia piloto', 'Iniciativa colaborativa com sensores de baixo custo.'],
  ['2019-09-09', 'report', 'Atualizacao de impactos em saude', 'Sistematizacao de sinais de alerta em populacoes sensiveis.'],
  ['2020-11-17', 'event', 'Plano integrado de mitigacao', 'Proposta de eixos para ar, solo, agua e governanca.'],
  ['2021-08-30', 'law', 'Novo ciclo de compromissos e metas', 'Definicao de metas intermediarias de qualidade ambiental.'],
  ['2022-05-26', 'report', 'Analise territorial de justica ambiental', 'Distribuicao espacial de exposicao e vulnerabilidade.'],
  ['2023-01-19', 'news', 'Cobertura sobre monitoramento continuo', 'Discussao sobre regularidade de dados publicos.'],
  ['2023-10-04', 'event', 'Pacto local por transparencia', 'Compromisso de publicacao de indicadores prioritarios.'],
  ['2024-03-12', 'report', 'Sintese de lacunas de evidencia', 'Mapa de lacunas para orientar curadoria e ingestao.'],
  ['2024-11-22', 'event', 'Revisao de trilhas educativas do universo', 'Atualizacao de percursos para publico e operadores.'],
  ['2025-06-01', 'event', 'Marco de publicacao do universo demo', 'Versao vitrine para replicacao de metodologia em outros territorios.'],
];

const EXTRA_TRAILS = [
  {
    slug: 'saude-territorio',
    title: 'Trilha Saude e Territorio',
    summary: 'Percurso focado em exposicao, indicadores e respostas em saude territorial.',
    steps: [
      ['Panorama de exposicao', 'Revisar relacoes entre po preto, PM e sintomas respiratorios.', 'ar-po-preto', true],
      ['Populacoes sensiveis', 'Mapear grupos com maior risco e barreiras de acesso.', 'saude-respiratoria-infantil', false],
      ['Subnotificacao', 'Identificar lacunas de registro e vigilancia.', 'subnotificacao', true],
      ['Rede de cuidado', 'Conectar dados ambientais com atencao basica.', 'rede-atencao-basica', false],
      ['Acoes priorizadas', 'Definir agenda de monitoramento e mitigacao local.', 'monitoramento-metricas-sensores', false],
    ],
  },
  {
    slug: 'ar-solo-rio-politica',
    title: 'Trilha Ar, Solo, Rio e Politica Publica',
    summary: 'Percurso integrador entre evidencia ambiental e governanca.',
    steps: [
      ['Fontes e emissao', 'Listar fontes emissoras e mecanismos de dispersao.', 'fontes-emissoras-processos', true],
      ['Solo e escoria', 'Avaliar pontos criticos de deposicao e remediacao.', 'solo-metais-escoria', false],
      ['Agua e riscos', 'Conectar drenagem, riscos hidricos e monitoramento.', 'agua-paraiba-do-sul', true],
      ['TACs e fiscalizacao', 'Relacionar instrumentos de governanca e indicadores.', 'politica-tacs-governanca', false],
      ['Justica ambiental', 'Priorizar acoes por vulnerabilidade territorial.', 'justica-ambiental-territorio', false],
    ],
  },
];

export function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function uid(seed) {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function mapTagsToCoreNode(tags) {
  const hay = tags.map((tag) => String(tag).toLowerCase());
  if (hay.some((tag) => tag.includes('ar') || tag.includes('pm') || tag.includes('particulado'))) return 'ar-po-preto';
  if (hay.some((tag) => tag.includes('solo') || tag.includes('escoria') || tag.includes('metal'))) return 'solo-metais-escoria';
  if (hay.some((tag) => tag.includes('agua') || tag.includes('rio') || tag.includes('hidric'))) return 'agua-paraiba-do-sul';
  if (hay.some((tag) => tag.includes('saude') || tag.includes('respirat'))) return 'saude-respiratoria-infantil';
  if (hay.some((tag) => tag.includes('tac') || tag.includes('politica') || tag.includes('governanca'))) return 'politica-tacs-governanca';
  if (hay.some((tag) => tag.includes('trabalho') || tag.includes('ocupacional'))) return 'trabalho-risco-impacto';
  if (hay.some((tag) => tag.includes('justica') || tag.includes('territorio'))) return 'justica-ambiental-territorio';
  return 'monitoramento-metricas-sensores';
}

function tokenizeForNodeMatch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

function resolveNodeSlugsFromTags(source, nodes) {
  const tagTokens = new Set((source.tags ?? []).flatMap((tag) => tokenizeForNodeMatch(tag)));
  const matched = [];
  for (const node of nodes) {
    const nodeTokens = new Set([
      ...tokenizeForNodeMatch(node.slug),
      ...tokenizeForNodeMatch(node.title ?? ''),
      ...(node.tags ?? []).flatMap((tag) => tokenizeForNodeMatch(tag)),
    ]);
    const hasMatch = [...tagTokens].some((token) => nodeTokens.has(token));
    if (hasMatch) matched.push(node.slug);
  }

  if (matched.length === 0) {
    matched.push(mapTagsToCoreNode(source.tags ?? []));
  }
  return [...new Set(matched)].slice(0, 6);
}

function parseSourceTitle(entry, index) {
  const note = String(entry.note ?? '').trim();
  if (note) return `[PENDENTE] ${note.slice(0, 120)}`;
  if (entry.kind === 'doi') return `[PENDENTE] DOI ${entry.value}`;
  if (entry.kind === 'url') return `[PENDENTE] URL ${entry.value}`;
  return `[PENDENTE] PDF local ${index + 1}`;
}

export function loadDemoSources() {
  const filePath = path.resolve(process.cwd(), 'data/demo/poluicao-vr.sources.json');
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      kind: String(item.kind ?? '').toLowerCase(),
      value: String(item.value ?? '').trim(),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8) : [],
      note: String(item.note ?? '').trim(),
    }))
    .filter((item) => ['doi', 'url', 'pdf'].includes(item.kind) && item.value);
}

async function upsertUniverse(client, publish) {
  const now = new Date().toISOString();
  await client.from('universes').upsert(
    {
      slug: DEMO_SLUG,
      title: DEMO_TITLE,
      summary: DEMO_SUMMARY,
      ui_theme: 'concreto-zen',
      published: publish,
      published_at: publish ? now : null,
    },
    { onConflict: 'slug' },
  );
  const { data } = await client.from('universes').select('id, slug').eq('slug', DEMO_SLUG).maybeSingle();
  return data;
}

async function seedNodes(client, universeId) {
  const secondary = SECONDARY_NODES.map((item) => ({
    slug: item[0],
    title: item[1],
    kind: item[2],
    summary: `No secundario para ${item[1].toLowerCase()} no universo demo de Volta Redonda.`,
    tags: item[3],
  }));
  const rows = [...CORE_NODES, ...secondary].map((node) => ({
    universe_id: universeId,
    slug: node.slug,
    title: node.title,
    kind: node.kind,
    summary: node.summary,
    tags: node.tags,
  }));
  await client.from('nodes').upsert(rows, { onConflict: 'universe_id,slug' });
  const { data } = await client.from('nodes').select('id, slug, title').eq('universe_id', universeId);
  const bySlug = new Map((data ?? []).map((node) => [node.slug, node]));
  return { count: data?.length ?? 0, bySlug };
}

async function seedEdges(client, universeId, nodeBySlug) {
  const rows = EDGE_RULES.map((edge) => {
    const from = nodeBySlug.get(edge[0]);
    const to = nodeBySlug.get(edge[1]);
    if (!from || !to) return null;
    return {
      id: uid(`demo:edge:${edge[0]}:${edge[1]}:${edge[2]}`),
      universe_id: universeId,
      from_node_id: from.id,
      to_node_id: to.id,
      label: edge[2],
      weight: 0.8,
    };
  }).filter(Boolean);
  if (rows.length > 0) {
    await client.from('edges').upsert(rows, { onConflict: 'id' });
  }
  return rows.length;
}

async function seedGlossary(client, universeId, nodeBySlug) {
  const rows = GLOSSARY_TERMS.map((item, index) => ({
    universe_id: universeId,
    term: item[1],
    slug: item[0],
    short_def: item[2],
    body: `${item[2]} Entrada de glossario do universo demo "Poluicao em Volta Redonda".`,
    tags: ['glossario', ...CORE_NODES[index % CORE_NODES.length].tags.slice(0, 2)],
    node_id: nodeBySlug.get(CORE_NODES[index % CORE_NODES.length].slug)?.id ?? null,
    question_prompts: [
      `Como ${item[1]} aparece no territorio de Volta Redonda?`,
      `Quais evidencias sustentam o termo ${item[1]} neste universo?`,
    ],
  }));
  await client.from('glossary_terms').upsert(rows, { onConflict: 'universe_id,slug' });
  return rows.length;
}

async function seedEvents(client, universeId, nodeBySlug) {
  const rows = EVENTS.map((event, index) => {
    const node = nodeBySlug.get(CORE_NODES[index % CORE_NODES.length].slug);
    return {
      id: uid(`demo:event:${event[0]}:${event[2]}`),
      universe_id: universeId,
      day: event[0],
      event_date: event[0],
      kind: event[1],
      title: event[2],
      summary: event[3],
      body: `${event[3]} Item seedado para linha do tempo do universo demo.`,
      tags: ['demo', ...CORE_NODES[index % CORE_NODES.length].tags.slice(0, 2)],
      node_id: node?.id ?? null,
      source_url: `seed://poluicao-vr/evento/${index + 1}`,
    };
  });
  await client.from('events').upsert(rows, { onConflict: 'id' });
  return rows.length;
}

async function findDocument(client, universeId, source) {
  if (source.kind === 'doi') {
    const { data } = await client
      .from('documents')
      .select('id')
      .eq('universe_id', universeId)
      .eq('doi', source.value)
      .eq('is_deleted', false)
      .maybeSingle();
    return data?.id ?? null;
  }
  if (source.kind === 'url') {
    const { data } = await client
      .from('documents')
      .select('id')
      .eq('universe_id', universeId)
      .eq('source_url', source.value)
      .eq('is_deleted', false)
      .maybeSingle();
    return data?.id ?? null;
  }
  const importMarker = `demo-local-pdf:${source.value}`;
  const { data } = await client
    .from('documents')
    .select('id')
    .eq('universe_id', universeId)
    .eq('import_source', importMarker)
    .eq('is_deleted', false)
    .maybeSingle();
  return data?.id ?? null;
}

async function createOrUpdateDocument(client, universeId, source, index) {
  const existingId = await findDocument(client, universeId, source);
  const title = parseSourceTitle(source, index);
  const baseRow = {
    universe_id: universeId,
    title,
    kind: source.kind === 'pdf' ? 'upload' : source.kind,
    import_source: source.kind === 'pdf' ? `demo-local-pdf:${source.value}` : 'demo-sources',
    abstract: source.note || null,
    status: 'link_only',
    doi: source.kind === 'doi' ? source.value : null,
    source_url:
      source.kind === 'doi'
        ? `https://doi.org/${source.value}`
        : source.kind === 'url'
          ? source.value
          : null,
    pdf_url:
      source.kind === 'url' && source.value.toLowerCase().endsWith('.pdf')
        ? source.value
        : null,
    is_deleted: false,
  };

  if (existingId) {
    await client.from('documents').update(baseRow).eq('id', existingId);
    return existingId;
  }
  const { data } = await client.from('documents').insert(baseRow).select('id').maybeSingle();
  return data?.id ?? null;
}

async function tryUploadLocalPdf(client, universeId, documentId, source) {
  const absolute = path.isAbsolute(source.value)
    ? source.value
    : path.resolve(process.cwd(), source.value);
  if (!fs.existsSync(absolute)) return { uploaded: false, reason: 'file_missing' };

  const buffer = fs.readFileSync(absolute);
  const objectPath = `universes/${universeId}/imports/${documentId}.pdf`;
  const { error } = await client.storage.from('cv-docs').upload(objectPath, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) {
    return { uploaded: false, reason: `storage_error:${error.message}` };
  }
  await client
    .from('documents')
    .update({
      storage_path: objectPath,
      status: 'uploaded',
      pdf_url: null,
    })
    .eq('id', documentId);
  return { uploaded: true, reason: 'ok' };
}

export async function importSourcesForUniverse(client, universeId, sources, options = {}) {
  const dryRun = Boolean(options.dryRun);
  let createdOrUpdated = 0;
  let uploaded = 0;
  let linkOnly = 0;
  let nodeLinksCreated = 0;
  const byNodeSlug = new Map();
  const nodeRowsAll = [];

  const { data: nodeRows } = await client
    .from('nodes')
    .select('id, slug, title, tags')
    .eq('universe_id', universeId);
  for (const node of nodeRows ?? []) {
    byNodeSlug.set(node.slug, node.id);
    nodeRowsAll.push(node);
  }

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    if (dryRun) continue;

    const documentId = await createOrUpdateDocument(client, universeId, source, index);
    if (!documentId) continue;
    createdOrUpdated += 1;

    if (source.kind === 'pdf') {
      const uploadResult = await tryUploadLocalPdf(client, universeId, documentId, source);
      if (uploadResult.uploaded) uploaded += 1;
      else linkOnly += 1;
    } else {
      linkOnly += 1;
    }

    const nodeSlugs = resolveNodeSlugsFromTags(source, nodeRowsAll);
    for (const [idx, nodeSlug] of nodeSlugs.entries()) {
      const nodeId = byNodeSlug.get(nodeSlug);
      if (!nodeId) continue;
      await client.from('node_documents').upsert(
        {
          universe_id: universeId,
          node_id: nodeId,
          document_id: documentId,
          weight: Math.max(100, 260 - idx * 20),
          note: 'Vinculo sugerido por tags da fonte demo.',
        },
        { onConflict: 'node_id,document_id' },
      );
      nodeLinksCreated += 1;
    }
  }

  return {
    totalSources: sources.length,
    documentsHandled: createdOrUpdated,
    uploaded,
    linkOnly,
    nodeDocumentLinksSeeded: nodeLinksCreated,
  };
}

async function seedNodeQuestions(client, universeId, nodeBySlug) {
  const templates = [
    'O que as evidencias atuais mostram sobre {node} em Volta Redonda?',
    'Quais lacunas de dados ainda existem para {node} neste universo?',
    'Que medidas de monitoramento e politica publica aparecem para {node}?',
  ];
  let count = 0;
  for (const node of CORE_NODES) {
    const row = nodeBySlug.get(node.slug);
    if (!row) continue;
    for (const [idx, template] of templates.entries()) {
      const question = template.replace('{node}', node.title);
      await client.from('node_questions').upsert(
        {
          universe_id: universeId,
          node_id: row.id,
          question,
          pin_rank: 100 + idx * 10,
        },
        { onConflict: 'node_id,question' },
      );
      count += 1;
    }
  }
  return count;
}

async function seedPlaceholderEvidences(client, universeId, nodeBySlug) {
  const { data: docs } = await client
    .from('documents')
    .select('id, title, source_url')
    .eq('universe_id', universeId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  const byNodeDoc = new Map();
  const { data: nodeDocs } = await client
    .from('node_documents')
    .select('node_id, document_id')
    .eq('universe_id', universeId);
  for (const row of nodeDocs ?? []) {
    const arr = byNodeDoc.get(row.node_id) ?? [];
    arr.push(row.document_id);
    byNodeDoc.set(row.node_id, arr);
  }

  let count = 0;
  for (const node of CORE_NODES) {
    const nodeRow = nodeBySlug.get(node.slug);
    if (!nodeRow) continue;
    const relatedDocIds = byNodeDoc.get(nodeRow.id) ?? [];
    for (let i = 0; i < 2; i += 1) {
      const docId =
        relatedDocIds[i] ??
        docs?.[count % Math.max(1, docs.length)]?.id ??
        null;
      const evidenceId = uid(`demo:evidence:${node.slug}:${i + 1}`);
      await client.from('evidences').upsert(
        {
          id: evidenceId,
          universe_id: universeId,
          node_id: nodeRow.id,
          document_id: docId,
          title: `[PLACEHOLDER] Evidencia ${i + 1} - ${node.title}`,
          summary:
            'Evidencia placeholder para curadoria inicial. Substituir por trecho curado apos importacao e processamento de PDFs.',
          confidence: 0.45,
          curated: true,
          source_url: null,
        },
        { onConflict: 'id' },
      );
      await client.from('node_evidences').upsert(
        {
          universe_id: universeId,
          node_id: nodeRow.id,
          evidence_id: evidenceId,
          pin_rank: 90 + i * 10,
        },
        { onConflict: 'node_id,evidence_id' },
      );
      count += 1;
    }
  }
  return count;
}

async function seedTrails(client, universeId, nodeBySlug) {
  let trailCount = 0;
  let stepCount = 0;

  for (const trail of EXTRA_TRAILS) {
    await client
      .from('trails')
      .upsert(
        {
          universe_id: universeId,
          slug: trail.slug,
          title: trail.title,
          summary: trail.summary,
          is_system: false,
        },
        { onConflict: 'universe_id,slug' },
      );

    const { data: trailRow } = await client
      .from('trails')
      .select('id')
      .eq('universe_id', universeId)
      .eq('slug', trail.slug)
      .maybeSingle();
    if (!trailRow) continue;
    trailCount += 1;

    for (let index = 0; index < trail.steps.length; index += 1) {
      const step = trail.steps[index];
      const nodeId = nodeBySlug.get(step[2])?.id ?? null;
      const guidedQuestion = step[3]
        ? `Quais evidencias sustentam ${step[0].toLowerCase()} no contexto de Volta Redonda?`
        : null;
      await client.from('trail_steps').upsert(
        {
          trail_id: trailRow.id,
          step_order: index + 1,
          title: step[0],
          instruction: step[1],
          node_id: nodeId,
          requires_question: Boolean(step[3]),
          guided_question: guidedQuestion,
          guided_node_id: nodeId,
          required_evidence_ids: null,
        },
        { onConflict: 'trail_id,step_order' },
      );
      stepCount += 1;
    }
  }
  return { trails: trailCount, steps: stepCount };
}

export async function seedPoluicaoVr(options = {}) {
  loadEnvLocal();
  const client = getServiceClient();
  if (!client) {
    throw new Error('Ambiente Supabase incompleto. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }

  const publish = options.publish !== false;
  const sources = options.sources ?? loadDemoSources();
  const universe = await upsertUniverse(client, publish);
  if (!universe?.id) {
    throw new Error('Falha ao criar/atualizar universo demo.');
  }

  const nodeResult = await seedNodes(client, universe.id);
  const edgeCount = await seedEdges(client, universe.id, nodeResult.bySlug);
  const glossaryCount = await seedGlossary(client, universe.id, nodeResult.bySlug);
  const eventCount = await seedEvents(client, universe.id, nodeResult.bySlug);
  const nodeQuestionCount = await seedNodeQuestions(client, universe.id, nodeResult.bySlug);
  const importSummary = await importSourcesForUniverse(client, universe.id, sources, {
    dryRun: Boolean(options.dryRun),
  });
  const placeholderEvidenceCount = await seedPlaceholderEvidences(client, universe.id, nodeResult.bySlug);
  const trailSummary = await seedTrails(client, universe.id, nodeResult.bySlug);

  return {
    universeId: universe.id,
    slug: DEMO_SLUG,
    published: publish,
    nodes: nodeResult.count,
    coreNodes: CORE_NODES.length,
    secondaryNodes: SECONDARY_NODES.length,
    edges: edgeCount,
    glossaryTerms: glossaryCount,
    events: eventCount,
    nodeQuestions: nodeQuestionCount,
    placeholderEvidences: placeholderEvidenceCount,
    trails: trailSummary.trails,
    trailSteps: trailSummary.steps,
    importSummary,
  };
}
