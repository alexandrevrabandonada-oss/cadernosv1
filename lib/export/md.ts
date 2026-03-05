import 'server-only';

type ThreadCitation = {
  index: number;
  docTitle: string;
  year: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  quote: string;
};

type RenderThreadInput = {
  universeTitle: string;
  question: string;
  answer: string;
  createdAt: string;
  confidence: {
    score: number | null;
    label: 'forte' | 'media' | 'fraca' | null;
  };
  limitations: string[];
  divergence: {
    flag: boolean;
    summary: string | null;
  };
  citations: ThreadCitation[];
};

type TrailStep = {
  order: number;
  title: string;
  instruction: string;
  nodeTitle: string | null;
  evidenceTitle: string | null;
  evidenceSummary: string | null;
};

type RenderTrailInput = {
  universeTitle: string;
  trailTitle: string;
  trailSummary: string;
  createdAt: string;
  steps: TrailStep[];
};

type RenderTutorSessionInput = {
  universeTitle: string;
  sessionId: string;
  createdAt: string;
  coveredPoints: Array<{ title: string; doneAt: string | null }>;
  keyFindings: Array<{ text: string; evidenceIds: string[]; qaThreadIds: string[] }>;
  limitations: Array<{ text: string }>;
  nextSteps: {
    nodes: Array<{ title: string; slug: string }>;
    trails: Array<{ title: string; slug: string | null }>;
    evidences: Array<{ title: string; summary: string }>;
  };
};

function pageLabel(start: number | null, end: number | null) {
  if (!start && !end) return 's/p';
  if (start && end && start !== end) return `p.${start}-${end}`;
  return `p.${start ?? end}`;
}

function shortQuote(text: string, max = 320) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function renderThreadMarkdown(input: RenderThreadInput) {
  const lines: string[] = [];
  lines.push(`# Dossie de Debate`);
  lines.push('');
  lines.push(`- Universo: ${input.universeTitle}`);
  lines.push(`- Data: ${new Date(input.createdAt).toISOString()}`);
  lines.push('');
  lines.push('## Pergunta');
  lines.push('');
  lines.push(input.question);
  lines.push('');
  lines.push('## Resposta');
  lines.push('');
  lines.push(input.answer);
  lines.push('');
  lines.push('## Forca do achado');
  lines.push('');
  if (input.confidence.label) {
    lines.push(
      `- Sinal: ${input.confidence.label}${typeof input.confidence.score === 'number' ? ` (${input.confidence.score}/100)` : ''}.`,
    );
  } else {
    lines.push('- Sinal: n/d.');
  }
  lines.push('');
  lines.push('## Limitacoes');
  lines.push('');
  if (input.limitations.length > 0) {
    input.limitations.slice(0, 4).forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('- Sem limitacoes adicionais registradas.');
  }
  lines.push('');
  if (input.divergence.flag) {
    lines.push('## Possivel divergencia entre fontes');
    lines.push('');
    lines.push(`- ${input.divergence.summary ?? 'Ha sinais de resultados divergentes ou inconclusivos entre fontes.'}`);
    lines.push('');
  }
  lines.push('## Evidencias');
  lines.push('');

  if (input.citations.length === 0) {
    lines.push('Sem evidencias citadas nesta thread.');
  } else {
    for (const citation of input.citations) {
      const year = citation.year ? ` (${citation.year})` : '';
      lines.push(
        `${citation.index}. ${citation.docTitle}${year}, ${pageLabel(citation.pageStart, citation.pageEnd)} — "${shortQuote(citation.quote)}"`,
      );
    }
  }
  lines.push('');

  const strictInsufficient = input.answer.toLowerCase().includes('nao encontrei evidencia suficiente');
  if (strictInsufficient) {
    lines.push('## Limitacoes');
    lines.push('');
    lines.push('- Modo estrito: sem evidencia suficiente, nao ha conclusao definitiva.');
    lines.push('- Recomenda-se ampliar base documental e refinar termos de busca.');
    lines.push('');
  }

  return lines.join('\n');
}

export function renderTrailMarkdown(input: RenderTrailInput) {
  const lines: string[] = [];
  lines.push('# Caderno de Estudo');
  lines.push('');
  lines.push(`- Universo: ${input.universeTitle}`);
  lines.push(`- Trilha: ${input.trailTitle}`);
  lines.push(`- Data: ${new Date(input.createdAt).toISOString()}`);
  lines.push('');
  lines.push('## Objetivo');
  lines.push('');
  lines.push(input.trailSummary || 'Percurso de estudo baseado em etapas orientadas.');
  lines.push('');
  lines.push('## Sumario');
  lines.push('');

  for (const step of input.steps) {
    lines.push(`- [${step.order}. ${step.title}](#passo-${step.order})`);
  }
  lines.push('');

  for (const step of input.steps) {
    lines.push(`## Passo ${step.order}: ${step.title}`);
    lines.push(`<a id="passo-${step.order}"></a>`);
    lines.push('');
    lines.push(step.instruction || 'Sem instrucao detalhada.');
    lines.push('');
    lines.push(`- No sugerido: ${step.nodeTitle ?? 'n/d'}`);
    lines.push(`- Evidencia recomendada: ${step.evidenceTitle ?? 'n/d'}`);
    if (step.evidenceSummary) {
      lines.push(`- Resumo da evidencia: ${shortQuote(step.evidenceSummary, 260)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function renderTutorSessionMarkdown(input: RenderTutorSessionInput) {
  const lines: string[] = [];
  lines.push('# Dossie da Sessao de Tutoria');
  lines.push('');
  lines.push(`- Universo: ${input.universeTitle}`);
  lines.push(`- Sessao: ${input.sessionId}`);
  lines.push(`- Data: ${new Date(input.createdAt).toISOString()}`);
  lines.push('');
  lines.push('## O que foi coberto');
  lines.push('');
  if (input.coveredPoints.length === 0) {
    lines.push('- Nenhum ponto concluido registrado.');
  } else {
    for (const point of input.coveredPoints) {
      lines.push(`- ${point.title}${point.doneAt ? ` (concluido em ${new Date(point.doneAt).toISOString()})` : ''}`);
    }
  }
  lines.push('');
  lines.push('## Principais achados');
  lines.push('');
  if (input.keyFindings.length === 0) {
    lines.push('- Sem achados suficientes para consolidar.');
  } else {
    input.keyFindings.forEach((finding, index) => {
      const refs = [
        finding.evidenceIds.length > 0 ? `evidencias: ${finding.evidenceIds.join(', ')}` : null,
        finding.qaThreadIds.length > 0 ? `threads: ${finding.qaThreadIds.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      lines.push(`${index + 1}. ${finding.text}${refs ? ` [${refs}]` : ''}`);
    });
  }
  lines.push('');
  lines.push('## Limitacoes e lacunas');
  lines.push('');
  if (input.limitations.length === 0) {
    lines.push('- Nenhuma limitacao relevante registrada.');
  } else {
    input.limitations.forEach((item) => lines.push(`- ${item.text}`));
  }
  lines.push('');
  lines.push('## Proximos passos');
  lines.push('');
  lines.push(`- Nos recomendados: ${input.nextSteps.nodes.map((n) => n.title).join(' | ') || 'n/d'}`);
  lines.push(`- Trilha recomendada: ${input.nextSteps.trails.map((t) => t.title).join(' | ') || 'n/d'}`);
  if (input.nextSteps.evidences.length > 0) {
    lines.push('- Evidencias recomendadas:');
    input.nextSteps.evidences.forEach((evidence) => lines.push(`  - ${evidence.title}: ${shortQuote(evidence.summary, 200)}`));
  } else {
    lines.push('- Evidencias recomendadas: n/d');
  }
  lines.push('');
  return lines.join('\n');
}
