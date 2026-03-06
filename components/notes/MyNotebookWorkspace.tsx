'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Carimbo } from '@/components/ui/Badge';
import { FilterRail } from '@/components/workspace/FilterRail';
import { ListKeyboardNavigator } from '@/components/workspace/ListKeyboardNavigator';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { NotebookExportControls } from '@/components/notes/NotebookExportControls';
import type { CadernoFilters } from '@/lib/filters/cadernoFilters';
import { serializeCadernoFilters } from '@/lib/filters/cadernoFilters';
import type { UserNote } from '@/lib/notes/types';
import { useUserNotes } from '@/hooks/useUserNotes';
import { buildUniverseHref } from '@/lib/universeNav';

type MyNotebookWorkspaceProps = {
  slug: string;
  title: string;
  filters: CadernoFilters;
  isPublished: boolean;
};

function clip(text: string, max = 240) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function sourceLabel(sourceType: UserNote['sourceType']) {
  const labels: Record<UserNote['sourceType'], string> = {
    evidence: 'Evidencia',
    thread: 'Thread',
    citation: 'Citacao',
    chunk: 'Trecho',
    doc: 'Documento',
    event: 'Evento',
    term: 'Termo',
    node: 'No',
  };
  return labels[sourceType];
}

function buildOriginHref(slug: string, note: UserNote) {
  if (note.sourceType === 'evidence' && note.sourceId) return `${buildUniverseHref(slug, 'provas')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'thread' && note.sourceId) return `${buildUniverseHref(slug, 'debate')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'event' && note.sourceId) return `${buildUniverseHref(slug, 'linha')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'term' && note.sourceId) return `${buildUniverseHref(slug, 'glossario')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'node') {
    const nodeSlug = typeof note.sourceMeta?.nodeSlug === 'string' ? note.sourceMeta.nodeSlug : '';
    if (nodeSlug) return `${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(nodeSlug)}&panel=detail`;
  }
  if (note.sourceType === 'citation' || note.sourceType === 'doc' || note.sourceType === 'chunk') {
    const docId = typeof note.sourceMeta?.docId === 'string' ? note.sourceMeta.docId : '';
    const pageStart = typeof note.sourceMeta?.pageStart === 'number' ? note.sourceMeta.pageStart : null;
    const pageHint = typeof note.sourceMeta?.pageHint === 'string' ? note.sourceMeta.pageHint : '';
    const hl = note.id;
    if (docId) {
      const qs = new URLSearchParams();
      if (pageStart) qs.set('p', String(pageStart));
      if (pageHint && !pageStart) qs.set('p', pageHint.replace(/^p\./, ''));
      if (hl) qs.set('hl', hl);
      const suffix = qs.toString();
      return `${buildUniverseHref(slug, `doc/${docId}`)}${suffix ? `?${suffix}` : ''}`;
    }
  }
  return buildUniverseHref(slug, '');
}

function sourceContext(note: UserNote) {
  if (note.sourceType !== 'doc') return null;
  const docTitle = typeof note.sourceMeta?.docTitle === 'string' ? note.sourceMeta.docTitle : note.title;
  const pageHint = typeof note.sourceMeta?.pageHint === 'string' ? note.sourceMeta.pageHint : '';
  return [docTitle, pageHint].filter(Boolean).join(' | ');
}

function buildContextualLinks(slug: string, note: UserNote) {
  const nodeSlug = typeof note.sourceMeta?.nodeSlug === 'string' ? note.sourceMeta.nodeSlug : '';
  const tagsCsv = note.tags.length > 0 ? `tags=${encodeURIComponent(note.tags.slice(0, 4).join(','))}` : '';
  return [
    { label: 'Ver Provas', href: `${buildUniverseHref(slug, 'provas')}${nodeSlug ? `?node=${encodeURIComponent(nodeSlug)}` : tagsCsv ? `?${tagsCsv}` : ''}` },
    { label: 'Ver Linha', href: `${buildUniverseHref(slug, 'linha')}${nodeSlug ? `?node=${encodeURIComponent(nodeSlug)}` : tagsCsv ? `?${tagsCsv}` : ''}` },
    { label: 'Ver Debate', href: `${buildUniverseHref(slug, 'debate')}${nodeSlug ? `?node=${encodeURIComponent(nodeSlug)}&status=strict_ok` : '?status=strict_ok'}` },
    { label: 'Abrir Tutor', href: buildUniverseHref(slug, 'tutor') },
  ];
}

export function MyNotebookWorkspace({ slug, title, filters, isPublished }: MyNotebookWorkspaceProps) {
  const { loading, notes, isLoggedIn, tagPool, updateNote, deleteNote, filterNotes } = useUserNotes({ universeSlug: slug });

  const filtered = useMemo(
    () =>
      filterNotes({
        kind: filters.kind,
        sourceType: filters.sourceType,
        tags: filters.tags,
        q: filters.q,
      }),
    [filterNotes, filters.kind, filters.q, filters.sourceType, filters.tags],
  );

  const selected = filtered.find((note) => note.id === filters.selected) ?? filtered[0] ?? null;

  const makeUrl = (override: Partial<CadernoFilters>) => {
    const next = { ...filters, ...override };
    const qs = serializeCadernoFilters(next);
    return qs ? `${buildUniverseHref(slug, 'meu-caderno')}?${qs}` : buildUniverseHref(slug, 'meu-caderno');
  };

  return (
    <WorkspaceShell
      slug={slug}
      section='caderno'
      title={`Meu Caderno: ${title}`}
      subtitle='Highlights e notas de estudo com abertura direta para a origem no universo.'
      selectedId={selected?.id ?? ''}
      detailTitle='Detalhe da anotacao'
      headerActions={
        <div className='stack' style={{ gap: '0.75rem' }}>
          <div className='toolbar-row'>
            <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'meu-caderno/recap')}>
              Ver Recap
            </Link>
          </div>
          <NotebookExportControls
            slug={slug}
            universeTitle={title}
            allItems={notes}
            filteredItems={filtered}
            isLoggedIn={isLoggedIn}
            isPublished={isPublished}
          />
        </div>
      }
      filter={
        <FilterRail title='Recortes do caderno'>
          <form method='get' className='stack'>
            <label>
              <span>Tipo</span>
              <select name='kind' defaultValue={filters.kind} style={{ width: '100%', minHeight: 42 }}>
                <option value='all'>Tudo</option>
                <option value='highlight'>Highlights</option>
                <option value='note'>Notas</option>
              </select>
            </label>
            <label>
              <span>Fonte</span>
              <select name='sourceType' defaultValue={filters.sourceType} style={{ width: '100%', minHeight: 42 }}>
                <option value='all'>Todas</option>
                <option value='evidence'>Evidencia</option>
                <option value='thread'>Thread</option>
                <option value='citation'>Citacao</option>
                <option value='chunk'>Trecho</option>
                <option value='doc'>Documento</option>
                <option value='event'>Evento</option>
                <option value='term'>Termo</option>
                <option value='node'>No</option>
              </select>
            </label>
            <label>
              <span>Busca</span>
              <input name='q' defaultValue={filters.q} placeholder='texto da nota...' style={{ width: '100%', minHeight: 42 }} />
            </label>
            <label>
              <span>Tags (csv)</span>
              <input name='tags' defaultValue={filters.tags.join(',')} placeholder='ex.: saude,prioritario' style={{ width: '100%', minHeight: 42 }} />
            </label>
            {tagPool.length > 0 ? (
              <p className='muted' style={{ margin: 0 }}>
                Sugestoes: {tagPool.slice(0, 12).join(', ')}
              </p>
            ) : null}
            <input type='hidden' name='selected' value={filters.selected} />
            <div className='toolbar-row'>
              <button className='ui-button' type='submit'>
                Aplicar
              </button>
              <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'meu-caderno')}>
                Limpar
              </Link>
            </div>
          </form>
        </FilterRail>
      }
      detail={
        selected ? (
          <div className='stack'>
            <article className='core-node stack'>
              <strong>{selected.title ?? `Entrada ${sourceLabel(selected.sourceType)}`}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {new Date(selected.createdAt).toLocaleString('pt-BR')} | {sourceLabel(selected.sourceType)}
              </p>
              {sourceContext(selected) ? <p className='muted' style={{ margin: 0 }}>{sourceContext(selected)}</p> : null}
              <textarea
                defaultValue={selected.text}
                rows={8}
                style={{ width: '100%' }}
                onBlur={(event) => void updateNote(selected.id, { text: event.currentTarget.value })}
              />
              <input
                defaultValue={selected.tags.join(',')}
                placeholder='tags csv'
                style={{ width: '100%', minHeight: 40 }}
                onBlur={(event) =>
                  void updateNote(selected.id, {
                    tags: event.currentTarget.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
              <div className='toolbar-row'>
                <Link className='ui-button' href={buildOriginHref(slug, selected)}>
                  Abrir origem
                </Link>
                <button className='ui-button' data-variant='ghost' type='button' onClick={() => void deleteNote(selected.id)}>
                  Deletar
                </button>
              </div>
            </article>
            <article className='core-node stack'>
              <strong>Proximas portas</strong>
              <div className='toolbar-row'>
                {buildContextualLinks(slug, selected).map((item) => (
                  <Link key={item.label} className='ui-button' data-variant='ghost' href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </article>
          </div>
        ) : null
      }
    >
      <div className='stack'>
        <ListKeyboardNavigator ids={filtered.map((item) => item.id)} selectedId={selected?.id ?? ''} />
        <Card className='stack'>
          <SectionHeader title='Entradas salvas' description='Revisite highlights e notas com links de retorno para o contexto original.' />
          <div className='toolbar-row'>
            <Carimbo>{`itens:${filtered.length}`}</Carimbo>
            <Carimbo>{loading ? 'carregando' : 'pronto'}</Carimbo>
          </div>
          <div className='core-grid'>
            {filtered.map((item) => (
              <article key={item.id} className='core-node stack' data-selected={selected?.id === item.id ? 'true' : undefined}>
                <strong>{item.title ?? `Entrada ${sourceLabel(item.sourceType)}`}</strong>
                <p className='muted' style={{ margin: 0 }}>
                  {sourceLabel(item.sourceType)} | {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                </p>
                {sourceContext(item) ? <p className='muted' style={{ margin: 0 }}>{sourceContext(item)}</p> : null}
                <p style={{ margin: 0 }}>{clip(item.text, 220)}</p>
                <div className='toolbar-row'>
                  <Link className='ui-button' data-variant='ghost' href={makeUrl({ selected: item.id, panel: 'detail' })}>
                    Ver detalhe
                  </Link>
                  <Link className='ui-button' data-variant='ghost' href={buildOriginHref(slug, item)}>
                    Abrir no app
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!loading && filtered.length === 0 ? (
            <EmptyState
              title='Seu caderno ainda esta vazio'
              description='Salve trechos em Provas, Debate, Tutor ou Documento para construir seu caderno deste universo.'
              actions={[{ label: 'Ir para Provas', href: buildUniverseHref(slug, 'provas') }]}
            />
          ) : null}
        </Card>
        <Card className='stack'>
          <SectionHeader title='Proximas portas' description='Continue o estudo em outras salas do universo.' />
          <div className='toolbar-row'>
            <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'meu-caderno/recap')}>
              Recap
            </Link>
            <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'provas')}>
              Provas
            </Link>
            <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'linha')}>
              Linha
            </Link>
            <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'debate')}>
              Debate
            </Link>
            <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'mapa')}>
              Mapa
            </Link>
            <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'tutor')}>
              Tutor
            </Link>
          </div>
        </Card>
      </div>
    </WorkspaceShell>
  );
}
