import 'server-only';
import type { SharePackItem } from '@/lib/share/pack';

export type SharePackTemplateInput = {
  universeSlug: string;
  universeTitle: string;
  weekKey: string;
  title: string;
  note?: string | null;
  items: SharePackItem[];
};

function absoluteUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (!base) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

function toTagToken(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim();
}

function collectHashtags(pack: SharePackTemplateInput) {
  const tags = new Set<string>();
  tags.add('#CadernosVivos');
  tags.add('#VoltaRedonda');
  if (pack.universeSlug.includes('poluicao') || pack.universeTitle.toLowerCase().includes('poluicao')) {
    tags.add('#VRAbandonada');
  }

  for (const item of pack.items.slice(0, 8)) {
    if (item.type === 'evidence') tags.add('#Evidencias');
    if (item.type === 'event') tags.add('#LinhaDoTempo');
    if (item.type === 'thread') tags.add('#DebatePublico');
  }

  const titleTag = toTagToken(pack.universeTitle);
  if (titleTag) tags.add(`#${titleTag.slice(0, 24)}`);
  return Array.from(tags).slice(0, 5);
}

function trimToLength(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function shortItemLine(item: SharePackItem, index: number) {
  return `${index + 1}. ${item.label} — ${absoluteUrl(item.url)}`;
}

export function buildInstagramCaption(pack: SharePackTemplateInput) {
  const hero = absoluteUrl(`/c/${pack.universeSlug}/s`);
  const hashtags = collectHashtags(pack);
  const lines: string[] = [];
  lines.push(`${pack.title} (${pack.weekKey})`);
  lines.push('');
  lines.push(`O que importa nesta semana em ${pack.universeTitle}: evidencias, contexto e proximos passos.`);
  lines.push(pack.note?.trim() ? trimToLength(pack.note.trim(), 220) : 'Comece pelo destaque 1 e avance para os demais links.');
  lines.push('');

  pack.items.slice(0, 5).forEach((item, index) => {
    lines.push(shortItemLine(item, index));
  });

  lines.push('');
  lines.push(`Hub do universo: ${hero}`);
  lines.push(hashtags.join(' '));
  return trimToLength(lines.join('\n'), 2000);
}

export function buildWhatsAppText(pack: SharePackTemplateInput) {
  const lines: string[] = [];
  lines.push(`${pack.title} (${pack.weekKey})`);
  lines.push(pack.note?.trim() || 'Selecao semanal pronta para circulacao.');
  lines.push('');
  pack.items.forEach((item, index) => {
    lines.push(`- ${index + 1}) ${item.label}`);
    lines.push(`  ${absoluteUrl(item.url)}`);
  });
  lines.push('');
  lines.push(`Hub: ${absoluteUrl(`/c/${pack.universeSlug}/s`)}`);
  return lines.join('\n');
}

export function buildTelegramText(pack: SharePackTemplateInput) {
  const lines: string[] = [];
  lines.push(`📌 ${pack.title}`);
  lines.push(`Universo: ${pack.universeTitle} | Semana: ${pack.weekKey}`);
  lines.push(pack.note?.trim() || 'Resumo semanal de itens compartilhaveis.');
  lines.push('');
  pack.items.forEach((item, index) => {
    lines.push(`${index + 1}. [${item.type}] ${item.label}`);
    lines.push(absoluteUrl(item.url));
  });
  lines.push('');
  lines.push(`Navegacao geral: ${absoluteUrl(`/c/${pack.universeSlug}`)}`);
  return lines.join('\n');
}

export function buildTwitterThread(pack: SharePackTemplateInput) {
  const tweets: string[] = [];
  tweets.push(`1/ ${pack.title} (${pack.weekKey})`);
  tweets.push(`2/ Porque importa: ${trimToLength(pack.note?.trim() || 'evidencias-first, contexto e proximos passos.', 200)}`);
  pack.items.slice(0, 3).forEach((item, index) => {
    tweets.push(`${index + 3}/ ${item.label}\n${absoluteUrl(item.url)}`);
  });
  tweets.push(`${pack.items.slice(0, 3).length + 3}/ Hub ${absoluteUrl(`/c/${pack.universeSlug}/s`)}`);
  return tweets.join('\n\n');
}

