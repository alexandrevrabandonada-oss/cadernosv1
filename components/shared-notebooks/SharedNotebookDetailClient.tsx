'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Carimbo } from '@/components/ui/Badge';
import { EmptyStateCard } from '@/components/ui/state/EmptyStateCard';
import { RestrictedStateCard } from '@/components/ui/state/RestrictedStateCard';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { FilterRail } from '@/components/workspace/FilterRail';
import { useToast } from '@/components/ui/Toast';
import { buildSharedNotebookItemHref } from '@/lib/shared-notebooks/links';
import type { SharedNotebookDetail, SharedNotebookItem } from '@/lib/shared-notebooks/types';
import { buildUniverseHref } from '@/lib/universeNav';
import { GenerateExportButton } from '@/components/export/GenerateExportButton';

type Props = {
  slug: string;
  notebookIdOrSlug: string;
};

function clip(text: string, max = 220) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function buildPromotedHref(slug: string, item: SharedNotebookItem) {
  if (item.promotedType === 'evidence' && item.promotedId) return `${buildUniverseHref(slug, 'provas')}?selected=${item.promotedId}&panel=detail`;
  if (item.promotedType === 'event' && item.promotedId) return `${buildUniverseHref(slug, 'linha')}?selected=${item.promotedId}&panel=detail`;
  if (item.promotedType === 'glossary_term' && item.promotedId) return `${buildUniverseHref(slug, 'glossario')}?selected=${item.promotedId}&panel=detail`;
  return '';
}

export function SharedNotebookDetailClient({ slug, notebookIdOrSlug }: Props) {
  const toast = useToast();
  const [data, setData] = useState<SharedNotebookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [sourceType, setSourceType] = useState('all');
  const [tags, setTags] = useState('');
  const [addedBy, setAddedBy] = useState('all');

  const refresh = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/shared-notebooks/${encodeURIComponent(notebookIdOrSlug)}?universeSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!response.ok) {
      setData(null);
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { notebook?: SharedNotebookDetail };
    setData(payload.notebook ?? null);
    setSelectedId((current) => current || payload.notebook?.items[0]?.id || '');
    setLoading(false);
  }, [notebookIdOrSlug, slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!data) return [] as SharedNotebookItem[];
    const tagSet = tags.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    return data.items.filter((item) => {
      if (sourceType !== 'all' && item.sourceType !== sourceType) return false;
      if (addedBy !== 'all' && item.addedBy !== addedBy) return false;
      if (tagSet.length > 0 && !tagSet.some((tag) => item.tags.map((entry) => entry.toLowerCase()).includes(tag))) return false;
      return true;
    });
  }, [addedBy, data, sourceType, tags]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  async function onRemove(item: SharedNotebookItem) {
    const response = await fetch(`/api/shared-notebooks/${encodeURIComponent(data?.id ?? '')}?universeSlug=${encodeURIComponent(slug)}&itemId=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    if (!response.ok) {
      toast.error('Falha ao remover item do coletivo.');
      return;
    }
    toast.success('Item removido do coletivo.');
    await refresh();
  }

  if (!loading && !data) {
    return (
      <Card className='stack'>
        <RestrictedStateCard title='Coletivo indisponivel' description='Este espaco pode ser privado, ainda nao estar publicado para seu perfil ou simplesmente nao existir neste universo.' primaryAction={{ label: 'Voltar aos coletivos', href: buildUniverseHref(slug, 'coletivos') }} secondaryAction={{ label: 'Ir para Meu Caderno', href: buildUniverseHref(slug, 'meu-caderno') }} />
      </Card>
    );
  }

  return (
    <WorkspaceShell
      slug={slug}
      section='caderno'
      title={data ? `Coletivo: ${data.title}` : 'Coletivo'}
      subtitle={data?.summary ?? 'Colecao compartilhada de highlights e notas curadas pelo grupo.'}
      selectedId={selected?.id ?? ''}
      detailTitle='Detalhe do item coletivo'
      headerActions={
        <div className='stack' style={{ gap: '0.75rem' }}>
          <div className='toolbar-row'>
            <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'coletivos')}>
              Voltar aos coletivos
            </Link>
            {data?.canEdit ? (
              <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, `coletivos/${data.slug}/review`)}>
                Abrir fila editorial
              </Link>
            ) : null}
          </div>
          {data ? (
            <GenerateExportButton
              endpoint='/api/export/shared-notebook'
              label='Exportar coletivo'
              payload={{ universeSlug: slug, notebookId: data.id, format: 'pdf' }}
              shareSlug={slug}
            />
          ) : null}
        </div>
      }
      filter={
        <FilterRail title='Filtros do coletivo'>
          <label>
            <span>Tipo</span>
            <select value={sourceType} onChange={(event) => setSourceType(event.currentTarget.value)} style={{ width: '100%', minHeight: 42 }}>
              <option value='all'>Tudo</option>
              <option value='highlight'>Highlights</option>
              <option value='note'>Notas</option>
              <option value='evidence'>Evidencias</option>
              <option value='thread'>Threads</option>
              <option value='doc'>Documento</option>
            </select>
          </label>
          <label>
            <span>Tags (csv)</span>
            <input value={tags} onChange={(event) => setTags(event.currentTarget.value)} style={{ width: '100%', minHeight: 42 }} />
          </label>
          <label>
            <span>Added by</span>
            <select value={addedBy} onChange={(event) => setAddedBy(event.currentTarget.value)} style={{ width: '100%', minHeight: 42 }}>
              <option value='all'>Todos</option>
              {Array.from(new Set((data?.items ?? []).map((item) => item.addedBy))).map((userId) => (
                <option key={userId} value={userId}>{userId}</option>
              ))}
            </select>
          </label>
        </FilterRail>
      }
      detail={
        selected ? (
          <div className='stack'>
            <article className='core-node stack'>
              <strong>{selected.title ?? 'Item coletivo'}</strong>
              <p className='muted' style={{ margin: 0 }}>{selected.sourceType} | {new Date(selected.createdAt).toLocaleString('pt-BR')}</p>
              <div className='toolbar-row'>
                <Carimbo>{`status:${selected.reviewStatus}`}</Carimbo>
                {selected.promotedType ? <Carimbo>{`promovido:${selected.promotedType}`}</Carimbo> : null}
              </div>
              <p style={{ margin: 0 }}>{selected.text}</p>
              {selected.note ? <p className='muted' style={{ margin: 0 }}>Nota coletiva: {selected.note}</p> : null}
              {selected.editorialNote ? <p className='muted' style={{ margin: 0 }}>Nota editorial: {selected.editorialNote}</p> : null}
              <div className='toolbar-row'>
                <Link className='ui-button' href={buildSharedNotebookItemHref(slug, selected)}>Abrir origem</Link>
                {buildPromotedHref(slug, selected) ? <Link className='ui-button' data-variant='ghost' href={buildPromotedHref(slug, selected)}>Abrir objeto criado</Link> : null}
                <button className='ui-button' data-variant='ghost' type='button' onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${buildUniverseHref(slug, `coletivos/${data?.slug}`)}`)}>Copiar link</button>
                {data?.canEdit ? <button className='ui-button' data-variant='ghost' type='button' onClick={() => void onRemove(selected)}>Remover</button> : null}
              </div>
            </article>
            <article className='core-node stack'>
              <strong>Portais</strong>
              <div className='toolbar-row'>
                <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'provas')}>Provas</Link>
                <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'debate')}>Debate</Link>
                <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'meu-caderno')}>Meu Caderno</Link>
              </div>
            </article>
          </div>
        ) : null
      }
    >
      <div className='stack'>
        <Card className='stack'>
          <SectionHeader title='Itens do coletivo' description='Selecione um item para abrir origem, nota coletiva e export.' />
          <div className='toolbar-row'>
            <Carimbo>{loading ? 'carregando' : `itens:${filtered.length}`}</Carimbo>
            {data ? <Carimbo>{`vis:${data.visibility}`}</Carimbo> : null}
            {data?.memberRole ? <Carimbo>{`role:${data.memberRole}`}</Carimbo> : null}
          </div>
          <div className='core-grid'>
            {filtered.map((item) => (
              <article key={item.id} className='core-node stack' data-selected={selected?.id === item.id ? 'true' : undefined}>
                <strong>{item.title ?? 'Item coletivo'}</strong>
                <p className='muted' style={{ margin: 0 }}>{item.sourceType} | {item.addedByLabel}</p>
                <div className='toolbar-row'>
                  <Carimbo>{`status:${item.reviewStatus}`}</Carimbo>
                  {item.promotedType ? <Carimbo>{`promovido:${item.promotedType}`}</Carimbo> : null}
                </div>
                <p style={{ margin: 0 }}>{clip(item.text)}</p>
                <div className='toolbar-row'>
                  <button className='ui-button' data-variant='ghost' type='button' onClick={() => setSelectedId(item.id)}>Ver detalhe</button>
                  <Link className='ui-button' data-variant='ghost' href={buildSharedNotebookItemHref(slug, item)}>Abrir origem</Link>
                </div>
              </article>
            ))}
          </div>
          {!loading && filtered.length === 0 ? <EmptyStateCard eyebrow='filtro sem resultado' title='Sem itens neste recorte' description='Ajuste filtros ou adicione highlights, notas e evidencias ao coletivo para formar uma base compartilhada.' primaryAction={{ label: 'Voltar aos coletivos', href: buildUniverseHref(slug, 'coletivos') }} secondaryAction={data?.canEdit ? { label: 'Abrir Meu Caderno', href: buildUniverseHref(slug, 'meu-caderno') } : undefined} /> : null}
        </Card>
      </div>
    </WorkspaceShell>
  );
}
