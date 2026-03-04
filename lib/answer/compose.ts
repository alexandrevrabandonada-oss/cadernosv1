import 'server-only';
import type { RetrieveCandidate } from '@/lib/search/retrieve';

type ComposeInput = {
  question: string;
  candidates: RetrieveCandidate[];
  insufficient: boolean;
  suggestions?: string[];
  insufficientReason?: string;
};

function toShortSentence(text: string, max = 180) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Trecho sem texto util.';
  const dot = clean.search(/[.!?]/);
  const base = dot > 40 ? clean.slice(0, dot + 1) : clean;
  if (base.length <= max) return base;
  return `${base.slice(0, max - 1)}…`;
}

export function composeAnswer(input: ComposeInput) {
  const lines: string[] = [];
  lines.push('## Achados');
  if (input.insufficient || input.candidates.length === 0) {
    lines.push('- Nao ha base suficiente para concluir com seguranca nesta pergunta.');
  } else {
    const bullets = input.candidates.slice(0, 6).map((candidate, index) => {
      const sentence = toShortSentence(candidate.text, 180);
      return `- ${sentence} (ver Evidencia ${index + 1})`;
    });
    lines.push(...bullets);
  }

  lines.push('');
  lines.push('## Limitacoes');
  if (input.insufficient) {
    lines.push(`- Modo estrito ativo: ${input.insufficientReason || 'evidencia insuficiente para conclusao.'}`);
    if (input.suggestions && input.suggestions.length > 0) {
      lines.push(`- Sugestoes de refinamento: ${input.suggestions.join('; ')}.`);
    } else {
      lines.push('- Sugestao: refine termos da pergunta e amplie a base documental.');
    }
  } else {
    const distinctDocs = new Set(input.candidates.map((item) => item.document_id)).size;
    lines.push(`- Sintese baseada em ${input.candidates.length} trechos de ${distinctDocs} documento(s).`);
    lines.push('- Pode haver vies de cobertura conforme os documentos disponiveis na base.');
  }

  lines.push('');
  lines.push('## Citacoes');
  lines.push('- As citacoes estruturadas estao no bloco `citations[]` desta resposta.');

  return lines.join('\n');
}
