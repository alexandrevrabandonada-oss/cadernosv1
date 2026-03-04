'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Carimbo } from '@/components/ui/Badge';

type RelatedDoc = {
  id: string;
  title: string;
  year: number | null;
  status: 'uploaded' | 'processed' | 'link_only' | 'error';
  sourceUrl?: string | null;
  weight?: number;
  note?: string | null;
};

type LinkedEvidence = {
  id: string;
  title: string;
  summary: string;
  quote: string;
  docId: string | null;
  docTitle: string | null;
  year: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  pinRank: number;
};

type MapNode = {
  id: string;
  slug?: string;
  label: string;
  type: 'conceito' | 'evento' | 'pessoa' | 'evidencia';
  summary?: string;
  tags?: string[];
  relatedDocuments?: RelatedDoc[];
  linkedEvidences?: LinkedEvidence[];
  suggestedQuestions?: string[];
};

type MapEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  weight: number | null;
};

type MapExplorerProps = {
  slug: string;
  source: 'db' | 'mock';
  nodes: MapNode[];
  edges: MapEdge[];
};

const NODE_W = 250;
const NODE_H = 118;
const GAP = 18;

function columnCount(viewport: number) {
  if (viewport < 760) return 1;
  if (viewport < 1040) return 2;
  return 3;
}

export function MapExplorer({ slug, source, nodes, edges }: MapExplorerProps) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('todos');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id ?? null);
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const handleResize = () => setColumns(columnCount(window.innerWidth));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tags = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((node) => (node.tags ?? [node.type]).forEach((tag) => set.add(tag.toLowerCase())));
    return ['todos', ...Array.from(set).sort()];
  }, [nodes]);

  const visibleNodes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return nodes.filter((node) => {
      const nodeTags = (node.tags ?? [node.type]).map((tag) => tag.toLowerCase());
      const hitTag = activeTag === 'todos' || nodeTags.includes(activeTag);
      const hitSearch =
        !term ||
        node.label.toLowerCase().includes(term) ||
        (node.summary ?? '').toLowerCase().includes(term) ||
        nodeTags.some((tag) => tag.includes(term));
      return hitTag && hitSearch;
    });
  }, [nodes, search, activeTag]);

  const visibleSet = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleSet.has(edge.fromNodeId) && visibleSet.has(edge.toNodeId)),
    [edges, visibleSet],
  );

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    visibleNodes.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = col * (NODE_W + GAP) + NODE_W / 2;
      const y = row * (NODE_H + GAP) + NODE_H / 2;
      map.set(node.id, { x, y });
    });
    return map;
  }, [visibleNodes, columns]);

  const canvasWidth = Math.max(columns * NODE_W + (columns - 1) * GAP, NODE_W);
  const rows = Math.max(Math.ceil(visibleNodes.length / columns), 1);
  const canvasHeight = rows * NODE_H + (rows - 1) * GAP;

  const selected = visibleNodes.find((node) => node.id === selectedNodeId) ?? visibleNodes[0] ?? null;

  return (
    <div className='stack'>
      <div className='toolbar-row'>
        <Carimbo>{source === 'db' ? 'dados:db' : 'dados:mock'}</Carimbo>
        <Carimbo>{`nos:${visibleNodes.length}`}</Carimbo>
        <Carimbo>{`arestas:${visibleEdges.length}`}</Carimbo>
      </div>

      <div className='map-filters'>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Buscar no</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Buscar por titulo, resumo ou tag'
            style={{ width: '100%', minHeight: 42 }}
          />
        </label>
        <div className='toolbar-row'>
          {tags.map((tag) => (
            <button
              key={tag}
              type='button'
              className='ui-button'
              data-variant={activeTag === tag ? 'primary' : 'ghost'}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className='map-workbench'>
        <section className='map-canvas'>
          <svg width={canvasWidth} height={canvasHeight} className='map-lines' aria-hidden='true'>
            {visibleEdges.map((edge) => {
              const from = positions.get(edge.fromNodeId);
              const to = positions.get(edge.toNodeId);
              if (!from || !to) return null;
              const midX = (from.x + to.x) / 2;
              const d = `M ${from.x} ${from.y} Q ${midX} ${from.y - 24} ${to.x} ${to.y}`;
              return <path key={edge.id} d={d} className='map-line-path' />;
            })}
          </svg>

          <div
            className='map-grid'
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, ${NODE_W}px))`,
              width: canvasWidth,
            }}
          >
            {visibleNodes.map((node) => (
              <button
                key={node.id}
                type='button'
                className='map-node'
                aria-pressed={selected?.id === node.id}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <strong>{node.label}</strong>
                <span className='muted'>{node.summary ?? 'Sem descricao detalhada.'}</span>
                <span className='map-node-tags'>{(node.tags ?? [node.type]).slice(0, 3).join(' · ')}</span>
              </button>
            ))}
            {visibleNodes.length === 0 ? (
              <p className='muted' style={{ margin: 0 }}>
                Nenhum no encontrado para o filtro atual.
              </p>
            ) : null}
          </div>
        </section>

        <aside className='card stack'>
          {selected ? (
            <>
              <h3 style={{ margin: 0 }}>{selected.label}</h3>
              <p className='muted' style={{ margin: 0 }}>
                {selected.summary ?? 'Descricao pendente para este no.'}
              </p>
              <div className='toolbar-row'>
                {(selected.tags ?? [selected.type]).map((tag) => (
                  <Carimbo key={tag}>{tag}</Carimbo>
                ))}
              </div>

              <section className='stack' style={{ gap: 8 }}>
                <strong>Documentos relacionados</strong>
                {(selected.relatedDocuments ?? []).map((doc) => (
                  <article key={doc.id} className='core-node'>
                    <strong>{doc.title}</strong>
                    <p className='muted' style={{ margin: 0 }}>
                      {doc.year ? `Ano ${doc.year}` : 'Ano n/d'} | {doc.status}
                    </p>
                    {doc.note ? (
                      <p className='muted' style={{ margin: 0 }}>
                        {doc.note}
                      </p>
                    ) : null}
                    <Link className='ui-button' href={`/c/${slug}/doc/${doc.id}`}>
                      Ver no documento
                    </Link>
                  </article>
                ))}
                {(selected.relatedDocuments ?? []).length === 0 ? (
                  <p className='muted' style={{ margin: 0 }}>
                    Nenhum documento relacionado encontrado pela heuristica atual.
                  </p>
                ) : null}
              </section>

              <section className='stack' style={{ gap: 8 }}>
                <strong>Evidencias do no</strong>
                {(selected.linkedEvidences ?? []).map((evidence) => (
                  <article key={evidence.id} className='core-node'>
                    <strong>{evidence.title}</strong>
                    <p className='muted' style={{ margin: 0 }}>
                      {evidence.docTitle ?? 'Sem doc'} {evidence.year ? `(${evidence.year})` : ''} | rank {evidence.pinRank}
                    </p>
                    <p style={{ margin: 0 }}>{evidence.quote}</p>
                    <Link
                      className='ui-button'
                      href={`/c/${slug}/provas?node=${encodeURIComponent(selected.id)}`}
                    >
                      Ver Provas filtrado
                    </Link>
                  </article>
                ))}
                {(selected.linkedEvidences ?? []).length === 0 ? (
                  <p className='muted' style={{ margin: 0 }}>
                    Nenhuma evidencia explicitamente vinculada a este no.
                  </p>
                ) : null}
              </section>

              <section className='stack' style={{ gap: 8 }}>
                <strong>Perguntas sugeridas</strong>
                {(selected.suggestedQuestions ?? []).slice(0, 3).map((question) => (
                  <Link
                    key={question}
                    className='ui-button'
                    href={`/c/${slug}/debate?node=${encodeURIComponent(selected.slug ?? '')}&q=${encodeURIComponent(question)}`}
                    data-variant='ghost'
                  >
                    {question}
                  </Link>
                ))}
                {(selected.suggestedQuestions ?? []).length === 0 ? (
                  <p className='muted' style={{ margin: 0 }}>
                    Sem perguntas sugeridas para este no.
                  </p>
                ) : null}
              </section>

              <section className='stack' style={{ gap: 8 }}>
                <strong>Portais</strong>
                <div className='toolbar-row'>
                  <Link className='ui-button' href={`/c/${slug}/provas?node=${encodeURIComponent(selected.id)}`}>
                    Provas filtrado
                  </Link>
                  <Link className='ui-button' href={`/c/${slug}/linha?kind=event`}>
                    Linha eventos
                  </Link>
                  <Link
                    className='ui-button'
                    href={`/c/${slug}/debate?node=${encodeURIComponent(selected.slug ?? '')}&q=${encodeURIComponent(
                      `Quais evidencias sustentam ${selected.label}?`,
                    )}`}
                  >
                    Debate sugerido
                  </Link>
                </div>
              </section>
            </>
          ) : (
            <p className='muted' style={{ margin: 0 }}>
              Selecione um no para abrir o painel lateral.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
