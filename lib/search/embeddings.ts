import 'server-only';

const EMBEDDING_DIMENSION = 1536;

export type EmbeddingProviderName = 'openai' | 'mock' | 'none';

export function getEmbeddingProviderName(): EmbeddingProviderName {
  const raw = (process.env.EMBEDDING_PROVIDER ?? '').toLowerCase().trim();
  if (raw === 'openai') return 'openai';
  if (raw === 'none') return 'none';
  return 'mock';
}

function normalize(vec: number[]) {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (!norm) return vec;
  return vec.map((v) => v / norm);
}

function mockEmbedding(text: string) {
  const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) {
    const code = lower.charCodeAt(i);
    const index = (code * 131 + i * 17) % EMBEDDING_DIMENSION;
    vector[index] += 1;
  }
  return normalize(vector);
}

async function embedWithOpenAI(texts: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Placeholder compatível: interface pronta para provider real.
  // A implementação final pode chamar a API de embeddings e retornar vetores no mesmo formato.
  return texts.map((text) => mockEmbedding(text));
}

export async function generateEmbeddings(texts: string[]) {
  if (texts.length === 0) return [] as Array<number[] | null>;

  const provider = getEmbeddingProviderName();
  if (provider === 'none') {
    return texts.map(() => null);
  }

  if (provider === 'openai') {
    const vectors = await embedWithOpenAI(texts);
    if (vectors) return vectors;
  }

  return texts.map((text) => mockEmbedding(text));
}

export function toVectorLiteral(vector: number[]) {
  return `[${vector.map((n) => Number(n.toFixed(8))).join(',')}]`;
}
