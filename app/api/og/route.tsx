import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import { getShareEvidence, getShareEvent, getShareExport, getShareNode, getShareTerm, getShareThread, getShareUniverse } from '@/lib/share/content';

export const runtime = 'nodejs';

const SIZE = { width: 1200, height: 630 };

function clip(text: string, max = 220) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function parseAchado(answer: string) {
  const lines = answer.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const bullet = lines.find((line) => line.startsWith('- '));
  if (bullet) return clip(bullet.replace(/^-+\s*/, ''), 220);
  return clip(lines.find((line) => !line.startsWith('##')) ?? answer, 220);
}

function ogCard(input: {
  universeTitle: string;
  headline: string;
  snippet: string;
  tagLine: string;
  badge: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #111111 0%, #1f1f1f 55%, #2b2b2b 100%)',
          color: '#f4f4ef',
          padding: '48px 54px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24, letterSpacing: 1.5, textTransform: 'uppercase', color: '#d9d9d0' }}>Cadernos Vivos</div>
          <div
            style={{
              fontSize: 18,
              padding: '8px 14px',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999,
              color: '#efefdf',
            }}
          >
            {input.badge}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: '#ecece1' }}>{clip(input.universeTitle, 86)}</div>
          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1, color: '#ffffff' }}>{clip(input.headline, 110)}</div>
          <div
            style={{
              marginTop: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 14,
              padding: '16px 18px',
              color: '#f1f1e8',
              fontSize: 28,
              lineHeight: 1.35,
            }}
          >
            {clip(input.snippet, 240)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d3d3ca', fontSize: 21 }}>
          <div>{clip(input.tagLine, 100)}</div>
          <div>Ver evidencias no Cadernos Vivos</div>
        </div>
      </div>
    ),
    SIZE,
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = String(searchParams.get('type') ?? '').trim();
  const slug = String(searchParams.get('u') ?? '').trim();
  const id = String(searchParams.get('id') ?? '').trim();

  if (!slug || !type) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  try {
    if (type === 'universe') {
      const universe = await getShareUniverse(slug);
      if (!universe) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const bullets = [
        ...universe.highlights.evidences.slice(0, 1).map((item) => item.title),
        ...universe.highlights.questions.slice(0, 1),
        ...universe.highlights.events.slice(0, 1).map((item) => item.title),
      ].filter(Boolean);
      const snippet = bullets.length > 0 ? bullets.join(' | ') : universe.summary;
      return ogCard({
        universeTitle: universe.title,
        headline: 'Vitrine do Universo',
        snippet,
        tagLine: 'Destaques publicados',
        badge: 'Universe',
      });
    }

    if (type === 'evidence') {
      if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
      const evidence = await getShareEvidence(slug, id);
      if (!evidence) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const pageLabel =
        evidence.pageStart && evidence.pageEnd && evidence.pageEnd !== evidence.pageStart
          ? `p.${evidence.pageStart}-${evidence.pageEnd}`
          : `p.${evidence.pageStart ?? evidence.pageEnd ?? 's/p'}`;
      return ogCard({
        universeTitle: evidence.universeTitle,
        headline: evidence.title,
        snippet: evidence.snippet,
        tagLine: `${evidence.docTitle ?? 'Documento'} ${evidence.year ? `(${evidence.year})` : ''} ${pageLabel}`.trim(),
        badge: 'Evidence',
      });
    }

    if (type === 'thread') {
      if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
      const thread = await getShareThread(slug, id);
      if (!thread) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const achado = parseAchado(thread.answer);
      return ogCard({
        universeTitle: thread.universeTitle,
        headline: thread.question,
        snippet: achado || thread.answer,
        tagLine: `${thread.mode} ${thread.dominantDocTitle ? `| ${thread.dominantDocTitle}` : ''}`.trim(),
        badge: 'Debate',
      });
    }

    if (type === 'event') {
      if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
      const event = await getShareEvent(slug, id);
      if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return ogCard({
        universeTitle: event.universeTitle,
        headline: event.title,
        snippet: event.summary,
        tagLine: `${event.kind}${event.day ? ` | ${new Date(`${event.day}T00:00:00`).toLocaleDateString('pt-BR')}` : ''}`,
        badge: 'Linha',
      });
    }

    if (type === 'export') {
      if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
      const exportItem = await getShareExport(slug, id);
      if (!exportItem) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const createdAt = new Date(exportItem.createdAt).toLocaleDateString('pt-BR');
      const bullets = exportItem.snippet
        .split(/[.!?]\s+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(' | ');
      return ogCard({
        universeTitle: exportItem.universeTitle,
        headline: exportItem.title,
        snippet: bullets || exportItem.snippet,
        tagLine: `Formato: ${exportItem.format.toUpperCase()} | ${createdAt}`,
        badge: 'Export',
      });
    }

    if (type === 'node') {
      if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
      const node = await getShareNode(slug, id);
      if (!node) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return ogCard({
        universeTitle: node.universeTitle,
        headline: node.title,
        snippet: node.snippet,
        tagLine: node.tags.slice(0, 2).join(' | ') || 'No do mapa',
        badge: 'Node',
      });
    }

    if (type === 'term') {
      if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
      const term = await getShareTerm(slug, id);
      if (!term) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return ogCard({
        universeTitle: term.universeTitle,
        headline: term.term,
        snippet: term.snippet,
        tagLine: term.tags.slice(0, 2).join(' | ') || 'Termo do glossario',
        badge: 'Term',
      });
    }

    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'og_failed' }, { status: 500 });
  }
}
