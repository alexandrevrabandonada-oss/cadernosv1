'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Carimbo } from '@/components/ui/Badge';
import { EmptyStateCard } from '@/components/ui/state/EmptyStateCard';
import type { SharedNotebookSummary } from '@/lib/shared-notebooks/types';
import { buildUniverseHref } from '@/lib/universeNav';

const templateLabels: Record<string, string> = {
  weekly_base: 'Base da semana',
  clipping: 'Clipping',
  study_group: 'Grupo de estudo',
  thematic_core: 'Nucleo tematico',
};

type Props = {
  slug: string;
  title: string;
};

export function SharedNotebookListClient({ slug, title }: Props) {
  const [items, setItems] = useState<SharedNotebookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/shared-notebooks?universeSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    const payload = (await response.json()) as { items?: SharedNotebookSummary[]; canCreate?: boolean };
    setItems(payload.items ?? []);
    setCanCreate(Boolean(payload.canCreate));
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className='stack'>
      <Card className='stack'>
        <SectionHeader title={`Coletivos de ${title}`} description='Colecoes coletivas para consolidar highlights e notas sem misturar rascunho pessoal com material compartilhado.' tag='Colab' />
        <div className='toolbar-row'>
          <Carimbo>{loading ? 'carregando' : `itens:${items.length}`}</Carimbo>
          <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'meu-caderno')}>
            Voltar ao caderno
          </Link>
          {canCreate ? (
            <Link className='ui-button' href={buildUniverseHref(slug, 'coletivos/novo')}>
              Criar por template
            </Link>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Cadernos compartilhados' description='Publicos quando o universo estiver publicado; team/private apenas para participantes.' />
        {items.length === 0 && !loading ? (
          <EmptyStateCard
            eyebrow='sem coletivos liberados'
            title='Nenhum coletivo disponivel neste recorte'
            description='Crie um coletivo por template ou volte ao seu caderno para preparar highlights e notas antes de compartilhar com o grupo.'
            primaryAction={canCreate ? { label: 'Criar por template', href: buildUniverseHref(slug, 'coletivos/novo') } : { label: 'Ir para Meu Caderno', href: buildUniverseHref(slug, 'meu-caderno') }}
            secondaryAction={canCreate ? { label: 'Ir para Meu Caderno', href: buildUniverseHref(slug, 'meu-caderno') } : undefined}
          />
        ) : (
          <div className='core-grid'>
            {items.map((item) => (
              <article key={item.id} className='core-node stack'>
                <strong>{item.title}</strong>
                <p className='muted' style={{ margin: 0 }}>{item.summary ?? 'Sem resumo ainda.'}</p>
                <p className='muted' style={{ margin: 0 }}>{item.templateMeta.microcopy || 'Coletivo compartilhado com governanca de visibilidade e revisao.'}</p>
                <div className='toolbar-row'>
                  {item.templateId ? <Carimbo>{templateLabels[item.templateId] ?? item.templateId}</Carimbo> : <Carimbo>Em branco</Carimbo>}
                  <Carimbo>{`vis:${item.visibility}`}</Carimbo>
                  <Carimbo>{`role:${item.memberRole ?? 'publico'}`}</Carimbo>
                  <Carimbo>{`itens:${item.itemCount}`}</Carimbo>
                </div>
                {item.templateMeta.suggestedTags.length > 0 ? (
                  <div className='toolbar-row'>
                    {item.templateMeta.suggestedTags.slice(0, 3).map((tag) => (
                      <Carimbo key={tag}>{`#${tag}`}</Carimbo>
                    ))}
                  </div>
                ) : null}
                <Link className='ui-button' href={buildUniverseHref(slug, `coletivos/${item.slug}`)}>
                  Abrir coletivo
                </Link>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
