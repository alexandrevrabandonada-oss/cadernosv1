'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { buildUniverseHref } from '@/lib/universeNav';

type RailItem = {
  label: string;
  href: string;
  kicker?: string;
  cta?: string;
};

function buildItems(slug: string, pathname: string): { title: string; description: string; items: RailItem[] } {
  const room = pathname.split('/')[3] || 'hub';

  if (room === 'mapa') {
    return {
      title: 'Movimentos do mapa',
      description: 'Atalhos curtos para explorar o recorte sem competir com a navegacao principal.',
      items: [
        { label: 'Voltar ao Hub', href: buildUniverseHref(slug, ''), kicker: 'contexto', cta: 'Voltar' },
        { label: 'Refinar filtros', href: '#filtros-mapa', kicker: 'mapa', cta: 'Abrir' },
        { label: 'Provas relacionadas', href: buildUniverseHref(slug, 'provas'), kicker: 'evidencias', cta: 'Abrir' },
        { label: 'Perguntas em debate', href: buildUniverseHref(slug, 'debate'), kicker: 'questoes', cta: 'Abrir' },
      ],
    };
  }

  if (room === 'meu-caderno') {
    return {
      title: 'Fluxo de estudo',
      description: 'Atalhos para retomar a leitura, revisar o recap e levar material ao coletivo.',
      items: [
        { label: 'Voltar ao Hub', href: buildUniverseHref(slug, ''), kicker: 'universo', cta: 'Voltar' },
        { label: 'Revisar recap', href: buildUniverseHref(slug, 'meu-caderno/recap'), kicker: 'semana', cta: 'Retomar' },
        { label: 'Acervo de provas', href: buildUniverseHref(slug, 'provas'), kicker: 'origem', cta: 'Abrir' },
        { label: 'Levar ao coletivo', href: buildUniverseHref(slug, 'coletivos'), kicker: 'compartilhar', cta: 'Adicionar' },
      ],
    };
  }

  if (room === 'provas' || room === 'linha' || room === 'debate' || room === 'glossario' || room === 'trilhas' || room === 'tutor' || room === 'coletivos' || room === 'tutoria') {
    return {
      title: 'Continuar com contexto',
      description: 'Passagens curtas para manter o mesmo recorte entre exploracao, estudo e leitura guiada.',
      items: [
        { label: 'Voltar ao Hub', href: buildUniverseHref(slug, ''), kicker: 'universo', cta: 'Voltar' },
        { label: 'Explorar o mapa', href: buildUniverseHref(slug, 'mapa'), kicker: 'nos', cta: 'Abrir' },
        { label: 'Abrir provas', href: buildUniverseHref(slug, 'provas'), kicker: 'evidencias', cta: 'Abrir' },
        { label: 'Abrir debate', href: buildUniverseHref(slug, 'debate'), kicker: 'questoes', cta: 'Abrir' },
      ],
    };
  }

  return {
    title: 'Entradas do universo',
    description: 'Portas editoriais para decidir por onde entrar sem duplicar a navegacao principal.',
    items: [
      { label: 'Explorar o mapa', href: buildUniverseHref(slug, 'mapa'), kicker: 'exploracao', cta: 'Abrir' },
      { label: 'Abrir provas', href: buildUniverseHref(slug, 'provas'), kicker: 'evidencias', cta: 'Abrir' },
      { label: 'Abrir debate', href: buildUniverseHref(slug, 'debate'), kicker: 'perguntas', cta: 'Abrir' },
      { label: 'Comecar pela trilha', href: `${buildUniverseHref(slug, 'trilhas')}?trail=comece-aqui`, kicker: 'estudo', cta: 'Comecar' },
    ],
  };
}

export function ContextRail({ slug }: { slug: string }) {
  const pathname = usePathname();
  const rail = buildItems(slug, pathname);

  return (
    <aside className='context-rail stack' aria-label={rail.title}>
      <div className='stack' style={{ gap: '0.35rem' }}>
        <small className='ui-eyebrow'>Assistente contextual</small>
        <strong>{rail.title}</strong>
        <p className='muted' style={{ margin: 0 }}>{rail.description}</p>
      </div>
      <div className='stack'>
        {rail.items.map((item) => (
          <Card key={item.href} className='stack context-rail-card' surface='plate'>
            <div className='toolbar-row'>
              <strong>{item.label}</strong>
              {item.kicker ? <small className='muted'>{item.kicker}</small> : null}
            </div>
            {item.href.startsWith('#') ? (
              <a className='ui-button' href={item.href}>
                {item.cta ?? 'Abrir'}
              </a>
            ) : (
              <Link className='ui-button' href={item.href}>
                {item.cta ?? 'Abrir'}
              </Link>
            )}
          </Card>
        ))}
      </div>
    </aside>
  );
}

