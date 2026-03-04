import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type QuickQuestion = {
  question: string;
  nodeSlug: string | null;
  label: string;
};

function normalizeLabel(value: string) {
  const first = value.trim().split(/\s+/)[0] ?? value.trim();
  return first.toUpperCase().slice(0, 10) || 'CORE';
}

function uniqueQuestions(items: QuickQuestion[], max = 10) {
  const seen = new Set<string>();
  const output: QuickQuestion[] = [];
  for (const item of items) {
    const key = item.question.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
    if (output.length >= max) break;
  }
  return output;
}

export async function getQuickQuestions(universeId: string): Promise<QuickQuestion[]> {
  const base: QuickQuestion[] = [
    {
      question: 'Quais sao os principais achados deste universo?',
      nodeSlug: null,
      label: 'ACHADOS',
    },
    {
      question: 'Quais evidencias mais fortes aparecem na base?',
      nodeSlug: null,
      label: 'EVIDENCIAS',
    },
    {
      question: 'Quais sao as principais limitacoes/lacunas dos estudos?',
      nodeSlug: null,
      label: 'LACUNAS',
    },
  ];

  const db = getSupabaseServiceRoleClient();
  if (!db) return base;

  const { data: nodesRaw } = await db
    .from('nodes')
    .select('id, slug, title, kind, tags')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: true })
    .limit(24);

  const coreNodes = (nodesRaw ?? []).filter((node) => {
    const tags = Array.isArray(node.tags) ? node.tags.map((tag) => String(tag).toLowerCase()) : [];
    return node.kind === 'core' || node.kind === 'concept' || tags.includes('core');
  });
  const coreIds = coreNodes.map((node) => node.id);
  const nodeById = new Map(coreNodes.map((node) => [node.id, node]));

  let fromCurated: QuickQuestion[] = [];
  if (coreIds.length > 0) {
    const { data: curated } = await db
      .from('node_questions')
      .select('node_id, question, pin_rank')
      .eq('universe_id', universeId)
      .in('node_id', coreIds)
      .order('pin_rank', { ascending: true })
      .limit(60);

    fromCurated = (curated ?? [])
      .map((item) => {
        const node = nodeById.get(item.node_id);
        if (!node) return null;
        return {
          question: item.question,
          nodeSlug: node.slug,
          label: normalizeLabel(node.title),
        } satisfies QuickQuestion;
      })
      .filter((item): item is QuickQuestion => Boolean(item));
  }

  const fallbackPerNode = coreNodes.slice(0, 4).flatMap((node) => {
    const label = normalizeLabel(node.title);
    return [
      {
        question: `O que os estudos mostram sobre ${node.title}?`,
        nodeSlug: node.slug,
        label,
      },
      {
        question: `Quais evidencias ligam ${node.title} a impactos na saude/ambiente?`,
        nodeSlug: node.slug,
        label,
      },
    ] satisfies QuickQuestion[];
  });

  return uniqueQuestions([...base, ...fromCurated, ...fallbackPerNode], 10).slice(0, 10);
}
