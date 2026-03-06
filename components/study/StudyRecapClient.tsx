'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Carimbo } from '@/components/ui/Badge';
import { EmptyStateCard } from '@/components/ui/state/EmptyStateCard';
import { PartialDataNotice } from '@/components/ui/state/PartialDataNotice';
import { buildStudyRecapData } from '@/lib/study/aggregate';
import { readActiveStudySession, readStudySessions } from '@/lib/study/local';
import { recommendStudyNext, type StudyRecommendationEvidence, type StudyRecommendationNode } from '@/lib/study/recommend';
import type { StudyRecapData, StudySession } from '@/lib/study/types';
import type { UiSection } from '@/lib/user/uiSettings';
import { buildUniverseHref } from '@/lib/universeNav';

type RecommendationSeed = {
  nodes: StudyRecommendationNode[];
  evidences: StudyRecommendationEvidence[];
};

type StudyRecapClientProps = {
  slug: string;
  title: string;
  isLoggedIn: boolean;
  lastSection?: UiSection;
  recommendationSeed: RecommendationSeed;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

function actionLabel(key: string) {
  const labels: Record<string, string> = {
    doc_open: 'docs abertos',
    evidence_view: 'evidencias vistas',
    thread_view: 'threads abertas',
    event_view: 'eventos vistos',
    trail_step_open: 'passos iniciados',
    trail_step_done: 'passos concluidos',
    tutor_point_open: 'pontos do tutor',
    tutor_ask: 'perguntas ao tutor',
    highlight_created: 'highlights',
    note_created: 'notas',
    export_notebook: 'exports do caderno',
    export_clip: 'clips exportados',
    focus_mode: 'entradas em foco',
  };
  return labels[key] ?? key;
}

function buildContinueItem(input: { slug: string; sessions: StudySession[]; activeSession?: StudySession | null; lastSection?: UiSection }) {
  const baseSessions = input.activeSession ? [input.activeSession, ...input.sessions] : input.sessions;
  const latestSession = baseSessions
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] ?? null;
  const latestItem = latestSession?.items.slice().sort((a, b) => b.count - a.count)[0] ?? null;
  if (latestItem?.href) {
    return {
      label: latestItem.label ?? 'Continuar estudo',
      href: latestItem.href,
      section: input.lastSection,
    };
  }
  if (input.lastSection) {
    return {
      label: `Continuar no ${input.lastSection}`,
      href: buildUniverseHref(input.slug, input.lastSection),
      section: input.lastSection,
    };
  }
  return null;
}

function buildGuestRecap(input: { slug: string; sessions: StudySession[]; activeSession?: StudySession | null; lastSection?: UiSection; seed: RecommendationSeed }) {
  const recommendations = recommendStudyNext({
    sessions: input.sessions,
    nodes: input.seed.nodes,
    evidences: input.seed.evidences,
  });
  return buildStudyRecapData({
    sessions: input.sessions,
    activeSession: input.activeSession,
    timeZone: 'America/Sao_Paulo',
    continueItem: buildContinueItem(input),
    recommendations,
  });
}

export function StudyRecapClient({ slug, title, isLoggedIn, lastSection, recommendationSeed }: StudyRecapClientProps) {
  const [recap, setRecap] = useState<StudyRecapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      const localSessions = readStudySessions(slug);
      const activeSession = readActiveStudySession(slug);
      const localRecap = buildGuestRecap({ slug, sessions: localSessions, activeSession, lastSection, seed: recommendationSeed });

      if (!isLoggedIn) {
        if (alive) {
          setRecap(localRecap);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/study?universeSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('study_recap_failed');
        const payload = (await response.json()) as StudyRecapData;
        if (alive) setRecap(payload);
      } catch {
        if (alive) setRecap(localRecap);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [isLoggedIn, lastSection, recommendationSeed, slug]);

  const latestSessions = useMemo(() => recap?.sessions.slice(0, 5) ?? [], [recap?.sessions]);
  const hasRecommendations = Boolean((recap?.recommendations.nodes.length ?? 0) > 0 || (recap?.recommendations.evidences.length ?? 0) > 0);

  return (
    <div className='stack'>
      <Card className='stack'>
        <SectionHeader title='Seu Recap' description={`Resumo leve do que voce estudou em ${title}.`} tag='Study' />
        <div className='toolbar-row'>
          <Carimbo>{loading ? 'carregando' : 'pronto'}</Carimbo>
          <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, 'meu-caderno')}>
            Voltar ao caderno
          </Link>
        </div>
      </Card>

      {recap?.continueItem ? (
        <Card className='stack'>
          <SectionHeader title='Continuar no ponto X' description='Retome o ultimo contexto util ou a ultima secao lembrada.' />
          <div className='toolbar-row'>
            <p style={{ margin: 0 }}>{recap.continueItem.label}</p>
            <Link className='ui-button' href={recap.continueItem.href}>
              Continuar
            </Link>
          </div>
        </Card>
      ) : null}

      <div className='core-grid'>
        <Card className='stack' data-testid='study-recap-today'>
          <SectionHeader title='Hoje' description='Metadados da sua atividade de estudo no dia atual.' />
          <p style={{ margin: 0 }}>Minutos focados: <strong>{recap?.today.focusMinutes ?? 0}</strong></p>
          <p style={{ margin: 0 }}>Highlights: <strong>{recap?.today.highlights ?? 0}</strong></p>
          <p style={{ margin: 0 }}>Notas: <strong>{recap?.today.notes ?? 0}</strong></p>
          <p style={{ margin: 0 }}>Itens estudados: <strong>{recap?.today.itemsStudied ?? 0}</strong></p>
        </Card>

        <Card className='stack' data-testid='study-recap-week'>
          <SectionHeader title='Semana' description='Streak util e volume de estudo, sem placar nem comparacao.' />
          <p style={{ margin: 0 }}>Dias ativos: <strong>{recap?.week.activeDays ?? 0}</strong></p>
          <p style={{ margin: 0 }}>Minutos focados: <strong>{recap?.week.focusMinutes ?? 0}</strong></p>
          <p style={{ margin: 0 }}>Itens estudados: <strong>{recap?.week.itemsStudied ?? 0}</strong></p>
          <div className='stack'>
            {(recap?.week.topActions ?? []).length === 0 ? (
              <PartialDataNotice
                eyebrow='sem historico suficiente'
                title='A semana ainda nao formou um padrao'
                description='Assim que voce abrir docs, salvar notas ou circular por outras salas, as acoes agregadas aparecem aqui.'
              />
            ) : (
              recap?.week.topActions.map((action) => (
                <p key={action.key} className='muted' style={{ margin: 0 }}>
                  {actionLabel(action.key)}: {action.count}
                </p>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className='stack'>
        <SectionHeader title='Ultimas sessoes' description='As sessoes mais recentes do universo, com duracao e itens tocados.' />
        {latestSessions.length === 0 ? (
          <EmptyStateCard
            eyebrow='recap ainda vazio'
            title='Nenhuma sessao registrada ainda'
            description='Abra um doc, entre em Focus Mode, salve um highlight ou use o tutor para iniciar um rastro de estudo neste universo.'
            primaryAction={{ label: 'Abrir documentos', href: buildUniverseHref(slug, 'provas') }}
            secondaryAction={{ label: 'Abrir Tutor', href: buildUniverseHref(slug, 'tutor') }}
          />
        ) : (
          <div className='stack'>
            {latestSessions.map((session) => (
              <article key={session.id} className='core-node stack'>
                <div className='toolbar-row'>
                  <strong>{formatWhen(session.startedAt)}</strong>
                  <Carimbo>{`duracao:${session.durationSec ?? 0}s`}</Carimbo>
                  <Carimbo>{`foco:${session.focusMinutes ?? 0}min`}</Carimbo>
                </div>
                <p className='muted' style={{ margin: 0 }}>
                  Itens tocados: {session.items.length} | Highlights: {session.stats.highlights ?? session.stats.highlight_created ?? 0} | Notas: {session.stats.notes ?? session.stats.note_created ?? 0}
                </p>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card className='stack'>
        <SectionHeader title='Proximas portas' description='2 nos e 3 evidencias sugeridos a partir do que voce tocou recentemente.' />
        {!hasRecommendations ? (
          <EmptyStateCard
            eyebrow='sem recomendacoes ainda'
            title='As proximas portas aparecem depois de algum uso'
            description='Quando houver leitura, highlights ou sessoes suficientes, o recap passa a sugerir nos e evidencias para continuar o percurso.'
            primaryAction={{ label: 'Abrir Mapa', href: buildUniverseHref(slug, 'mapa') }}
          />
        ) : (
          <div className='core-grid'>
            {recap?.recommendations.nodes.map((node) => (
              <article key={node.id} className='core-node stack'>
                <strong>{node.title}</strong>
                {node.summary ? <p className='muted' style={{ margin: 0 }}>{node.summary}</p> : null}
                <Link className='ui-button' data-variant='ghost' href={`${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(node.slug)}&panel=detail`}>
                  Abrir no mapa
                </Link>
              </article>
            ))}
            {recap?.recommendations.evidences.map((evidence) => (
              <article key={evidence.id} className='core-node stack'>
                <strong>{evidence.title}</strong>
                {evidence.summary ? <p className='muted' style={{ margin: 0 }}>{evidence.summary}</p> : null}
                <Link className='ui-button' data-variant='ghost' href={evidence.href}>
                  Abrir evidencia
                </Link>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
