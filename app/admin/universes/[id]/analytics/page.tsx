import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyStateCard } from '@/components/ui/state/EmptyStateCard';
import { PartialDataNotice } from '@/components/ui/state/PartialDataNotice';
import { getAdminDb, getUniverseById } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { getUniverseAnalyticsDashboard } from '@/lib/analytics/dashboard';

type AdminUniverseAnalyticsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUniverseAnalyticsPage({ params }: AdminUniverseAnalyticsPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const universe = await getUniverseById(id);
  if (!universe) notFound();

  const dashboard = await getUniverseAnalyticsDashboard(id);
  const db = getAdminDb();
  const [nodeRows, evidenceRows] = await Promise.all([
    db
      ? db.from('nodes').select('id, title').eq('universe_id', id).in(
          'id',
          dashboard.last7d.topNodes.map((item) => item.objectId),
        )
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    db
      ? db.from('evidences').select('id, title').eq('universe_id', id).in(
          'id',
          dashboard.last7d.topEvidences.map((item) => item.objectId),
        )
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
  ]);
  const nodeTitle = new Map((nodeRows.data ?? []).map((row) => [row.id, row.title]));
  const evidenceTitle = new Map((evidenceRows.data ?? []).map((row) => [row.id, row.title]));

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Analytics' },
          ]}
          ariaLabel='Trilha analytics universo'
        />
        <SectionHeader
          title={`Analytics: ${universe.title}`}
          description='Impacto de produto por universo: funil, CTAs, share conversion e objetos mais acionados.'
          tag='Produto'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${id}`}>
            Voltar ao universo
          </Link>
          <Link className='ui-button' data-variant='ghost' href={`/admin/universes/${id}/share-pack`}>
            Abrir share-pack
          </Link>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Últimas 24h' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Page views</span>
            <strong>{dashboard.last24h.pageViews}</strong>
          </div>
          <div className='status-item'>
            <span>Share views</span>
            <strong>{dashboard.last24h.shareViews}</strong>
          </div>
          <div className='status-item'>
            <span>Share open app</span>
            <strong>{dashboard.last24h.shareOpenAppClicks}</strong>
          </div>
          <div className='status-item'>
            <span>Taxa open app/share</span>
            <strong>{dashboard.last24h.shareOpenRatePct}%</strong>
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Top CTAs (24h)' />
        <div className='stack'>
          {dashboard.last24h.topCtas.map((item) => (
            <article key={item.cta} className='core-node'>
              <strong>{item.cta}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {item.count} cliques
              </p>
            </article>
          ))}
          {dashboard.last24h.topCtas.length === 0 ? (
            <EmptyStateCard
              eyebrow='janela sem clique'
              title='Sem cliques de CTA nas ultimas 24h'
              description='Ainda nao houve interacao suficiente para destacar chamadas de acao neste periodo. Revise publicacao, share pages e distribuicao recente.'
            />
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Funil (7 dias)' />
        <div className='stack'>
          {dashboard.last7d.funnel.map((step) => (
            <article key={step.step} className='core-node'>
              <div className='toolbar-row'>
                <strong>{step.step}</strong>
                <Carimbo>{`${step.ratePct}%`}</Carimbo>
              </div>
              <p className='muted' style={{ margin: 0 }}>
                {step.count} eventos
              </p>
            </article>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Top 5 nós e evidências (7 dias)' />
        <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <article className='stack'>
            <strong>Nós</strong>
            <div className='stack'>
              {dashboard.last7d.topNodes.map((item) => (
                <div key={item.objectId} className='core-node'>
                  <strong>{nodeTitle.get(item.objectId) ?? item.objectId}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {item.count} seleções
                  </p>
                </div>
              ))}
              {dashboard.last7d.topNodes.length === 0 ? (
                <PartialDataNotice
                  eyebrow='sem sinal suficiente'
                  title='Sem selecoes de no no periodo'
                  description='A base ainda nao reuniu navegacao suficiente para apontar nos dominantes nesta janela de sete dias.'
                />
              ) : null}
            </div>
          </article>
          <article className='stack'>
            <strong>Evidências</strong>
            <div className='stack'>
              {dashboard.last7d.topEvidences.map((item) => (
                <div key={item.objectId} className='core-node'>
                  <strong>{evidenceTitle.get(item.objectId) ?? item.objectId}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {item.count} cliques
                  </p>
                </div>
              ))}
              {dashboard.last7d.topEvidences.length === 0 ? (
                <PartialDataNotice
                  eyebrow='sem tracao recente'
                  title='Sem cliques em evidencia no periodo'
                  description='Ainda nao ha massa critica suficiente para comparar evidencias nesta janela de sete dias.'
                />
              ) : null}
            </div>
          </article>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Nós com maior insufficient (7 dias)' />
        <div className='stack'>
          {dashboard.last7d.insufficientByNode.map((item) => (
            <article key={item.nodeId} className='core-node'>
              <strong>{nodeTitle.get(item.nodeId) ?? item.nodeId}</strong>
              <p className='muted' style={{ margin: 0 }}>
                insufficient: {item.insufficientRatePct}% | asks: {item.asks}
              </p>
            </article>
          ))}
          {dashboard.last7d.insufficientByNode.length === 0 ? (
            <PartialDataNotice
              eyebrow='dados insuficientes'
              title='Ainda nao ha base para taxa de insufficient por no'
              description='Quando o volume de perguntas e respostas crescer, esta leitura passa a mostrar onde o tutor ainda nao sustenta bem a resposta.'
            />
          ) : null}
        </div>
      </Card>
    </main>
  );
}

