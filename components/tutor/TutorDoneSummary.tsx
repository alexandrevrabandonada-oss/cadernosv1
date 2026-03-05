'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShareButton } from '@/components/share/ShareButton';
import { Carimbo } from '@/components/ui/Badge';
import { useTutorSession } from '@/hooks/useTutorSession';
import type { TutorSessionSummaryView } from '@/app/actions/tutorSummary';

type TutorPoint = {
  id: string;
  orderIndex: number;
  nodeId: string | null;
  nodeSlug: string | null;
  title: string;
  goal: string;
  requiredEvidenceIds: string[];
  guidedQuestions: string[];
  status: 'todo' | 'done';
  completedAt: string | null;
  lastThreadId: string | null;
};

type TutorDoneSummaryProps = {
  slug: string;
  universeId: string;
  sessionId: string;
  mode: 'visitor' | 'logged';
  points: TutorPoint[];
  currentIndex: number;
  summary: TutorSessionSummaryView | null;
  canExport: boolean;
  averageConfidence: number | null;
};

export function TutorDoneSummary({
  slug,
  universeId,
  sessionId,
  mode,
  points,
  currentIndex,
  summary,
  canExport,
  averageConfidence,
}: TutorDoneSummaryProps) {
  const tutor = useTutorSession({
    slug,
    sessionId,
    mode,
    points,
    currentIndex,
  });
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [exportShareId, setExportShareId] = useState<string>('');

  const covered = points.filter((point) => tutor.stateByPoint[point.id]?.done || point.status === 'done');
  const coreSuggestions = covered.filter((point) => point.nodeSlug).slice(0, 2);
  const coveredPoints = summary?.coveredPoints ?? covered.map((point) => ({
    title: point.title,
    nodeId: point.nodeId,
    doneAt: point.completedAt,
  }));
  const findings = summary?.keyFindings ?? [];
  const limitations = summary?.limitations ?? [];
  const nextSteps = summary?.nextSteps ?? {
    nodes: coreSuggestions.map((item) => ({ id: item.nodeId ?? item.id, slug: item.nodeSlug ?? slug, title: item.title })),
    trails: [{ id: 'local', slug: 'comece-aqui', title: 'Comece Aqui' }],
    evidences: [],
  };

  async function exportSessionDossier() {
    if (!canExport) return;
    setExporting(true);
    setExportResult(null);
    setExportShareId('');
    try {
      const response = await fetch('/api/admin/export/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universeId,
          sessionId,
          isPublic: false,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        assets?: Array<{ id: string; format: string; signedUrl: string | null }>;
      };
      if (!response.ok) throw new Error(data.error ?? 'Falha ao gerar dossie da sessao.');
      const pdf = data.assets?.find((asset) => asset.format === 'pdf')?.signedUrl ?? null;
      const shareAsset = data.assets?.find((asset) => asset.format === 'pdf') ?? data.assets?.[0] ?? null;
      setExportResult(pdf ?? 'Dossie gerado com sucesso.');
      setExportShareId(shareAsset?.id ?? '');
    } catch (error) {
      setExportResult(error instanceof Error ? error.message : 'Falha ao gerar dossie da sessao.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className='stack'>
      <div className='toolbar-row'>
        <Carimbo>{`concluidos:${covered.length}/${points.length}`}</Carimbo>
        {typeof averageConfidence === 'number' ? <Carimbo>{`confianca media:${averageConfidence}/100`}</Carimbo> : null}
      </div>
      <article className='core-node stack'>
        <strong>O que foi coberto</strong>
        {coveredPoints.map((point, index) => (
          <p key={`${point.title}-${index}`} style={{ margin: 0 }}>
            {index + 1}. {point.title}
          </p>
        ))}
        {coveredPoints.length === 0 ? (
          <p className='muted' style={{ margin: 0 }}>
            Nenhum ponto concluido ainda.
          </p>
        ) : null}
      </article>

      <article className='core-node stack'>
        <strong>Principais achados</strong>
        {findings.length > 0 ? (
          findings.map((finding, index) => (
            <p key={`${finding.text}-${index}`} style={{ margin: 0 }}>
              {index + 1}. {finding.text}
            </p>
          ))
        ) : (
          <p className='muted' style={{ margin: 0 }}>
            Achados serao consolidados conforme perguntas e evidencias utilizadas.
          </p>
        )}
      </article>

      <article className='core-node stack'>
        <strong>Limitacoes e lacunas</strong>
        {limitations.length > 0 ? (
          limitations.map((item, index) => (
            <p key={`${item.text}-${index}`} style={{ margin: 0 }}>
              - {item.text}
            </p>
          ))
        ) : (
          <p className='muted' style={{ margin: 0 }}>
            Sem limitacoes relevantes registradas.
          </p>
        )}
      </article>

      <article className='core-node stack'>
        <strong>Proximos passos</strong>
        <p style={{ margin: 0 }}>1. Nos recomendados: {nextSteps.nodes.map((item) => item.title).join(' | ') || 'n/d'}.</p>
        <p style={{ margin: 0 }}>
          2. Continue pela trilha:{' '}
          {nextSteps.trails[0]?.slug ? (
            <Link href={`/c/${slug}/trilhas?trail=${encodeURIComponent(nextSteps.trails[0].slug)}`}>
              {nextSteps.trails[0].title}
            </Link>
          ) : (
            nextSteps.trails[0]?.title ?? 'comece-aqui'
          )}
          .
        </p>
        <p style={{ margin: 0 }}>
          3. Evidencias recomendadas: {nextSteps.evidences.map((item) => item.title).join(' | ') || 'n/d'}.
        </p>
      </article>

      <article className='core-node stack'>
        <strong>Acoes</strong>
        <div className='toolbar-row'>
          {nextSteps.nodes[0]?.slug ? (
            <Link className='ui-button' href={`/c/${slug}/mapa?q=${encodeURIComponent(nextSteps.nodes[0].title)}`}>
              Explorar no recomendado
            </Link>
          ) : null}
          <Link className='ui-button' data-variant='ghost' href={`/c/${slug}/trilhas?trail=comece-aqui`}>
            Continuar por trilha
          </Link>
          {canExport ? (
            <button className='ui-button' type='button' onClick={() => void exportSessionDossier()} disabled={exporting}>
              {exporting ? 'Gerando...' : 'Gerar Dossie da Sessao'}
            </button>
          ) : null}
        </div>
        {exportResult ? (
          <div className='toolbar-row'>
            {exportResult.startsWith('http') ? (
              <a className='ui-button' href={exportResult} target='_blank' rel='noreferrer'>
                Baixar PDF da sessao
              </a>
            ) : (
              <p className='muted' style={{ margin: 0 }}>
                {exportResult}
              </p>
            )}
            {exportShareId ? (
              <ShareButton
                url={`/c/${slug}/s/export/${exportShareId}`}
                title='Dossie da sessao'
                text='Resumo de tutor compartilhavel no Cadernos Vivos.'
                label='Compartilhar dossie'
              />
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}
