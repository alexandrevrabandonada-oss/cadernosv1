import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminSystemStatus } from '@/lib/status/health';

export const dynamic = 'force-dynamic';

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return <Carimbo variant={ok ? 'default' : 'alert'}>{`${label}: ${ok ? 'ok' : 'pendente'}`}</Carimbo>;
}

export default async function AdminStatusPage() {
  const status = await getAdminSystemStatus();
  const envEntries: Array<{ label: string; value: boolean }> = [
    { label: 'NEXT_PUBLIC_SUPABASE_URL', value: status.env.nextPublicSupabaseUrl },
    { label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: status.env.nextPublicSupabaseAnonKey },
    { label: 'NEXT_PUBLIC_SITE_URL', value: status.env.nextPublicSiteUrl },
    { label: 'SUPABASE_SERVICE_ROLE_KEY', value: status.env.supabaseServiceRoleKey },
    { label: 'SUPABASE_PROJECT_REF', value: status.env.supabaseProjectRef },
    { label: 'SUPABASE_DB_PASSWORD', value: status.env.supabaseDbPassword },
    { label: 'SUPABASE_ACCESS_TOKEN', value: status.env.supabaseAccessToken },
    { label: 'VERCEL_TOKEN', value: status.env.vercelToken },
    { label: 'VERCEL_ORG_ID', value: status.env.vercelOrgId },
    { label: 'VERCEL_PROJECT_ID', value: status.env.vercelProjectId },
    { label: 'UPSTASH_REDIS_REST_URL', value: status.env.upstashUrl },
    { label: 'UPSTASH_REDIS_REST_TOKEN', value: status.env.upstashToken },
    { label: 'SENTRY_DSN', value: status.env.sentryDsn },
    { label: 'SENTRY_AUTH_TOKEN', value: status.env.sentryAuthToken },
    { label: 'SENTRY_ENVIRONMENT', value: status.env.sentryEnvironment },
  ];

  return (
    <main className='stack'>
      <Card className='stack'>
        <SectionHeader
          title='Admin Status (24h)'
          description='Painel operacional completo com latencia, erros e throughput.'
          tag='Ops'
        />
      </Card>

      <Card className='stack'>
        <SectionHeader title='Metricas Ask (24h)' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Requests</span>
            <strong>{status.ops24h.ask.requests}</strong>
          </div>
          <div className='status-item'>
            <span>429</span>
            <strong>
              {status.ops24h.ask.rateLimitedCount} ({status.ops24h.ask.rateLimitedPct}%)
            </strong>
          </div>
          <div className='status-item'>
            <span>5xx</span>
            <strong>
              {status.ops24h.ask.errors5xxCount} ({status.ops24h.ask.errors5xxPct}%)
            </strong>
          </div>
          <div className='status-item'>
            <span>Latência média</span>
            <strong>{status.ops24h.ask.latencyAvgMs}ms</strong>
          </div>
          <div className='status-item'>
            <span>Docs distintos (média)</span>
            <strong>{status.ops24h.ask.docsDistintosAvg}</strong>
          </div>
          <div className='status-item'>
            <span>Latência p95</span>
            <strong>{status.ops24h.ask.latencyP95Ms}ms</strong>
          </div>
          <div className='status-item'>
            <span>Latência max</span>
            <strong>{status.ops24h.ask.latencyMaxMs}ms</strong>
          </div>
          <div className='status-item'>
            <span>Confianca (F/M/FR)</span>
            <strong>
              {status.ops24h.ask.confidenceStrong}/{status.ops24h.ask.confidenceMedium}/{status.ops24h.ask.confidenceWeak}
            </strong>
          </div>
          <div className='status-item'>
            <span>Divergencia</span>
            <strong>{status.ops24h.ask.divergencePct}%</strong>
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Ingest e Exports (24h)' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Ingest pending/running/error</span>
            <strong>
              {status.ops24h.ingest.pending}/{status.ops24h.ingest.running}/{status.ops24h.ingest.error}
            </strong>
          </div>
          <div className='status-item'>
            <span>Ingest média por job</span>
            <strong>{status.ops24h.ingest.avgJobLatencyMs}ms</strong>
          </div>
          <div className='status-item'>
            <span>Ingest logs 24h</span>
            <strong>{status.ops24h.ingest.jobLogsCount}</strong>
          </div>
          <div className='status-item'>
            <span>Exports gerados</span>
            <strong>{status.ops24h.exports.generated}</strong>
          </div>
          <div className='status-item'>
            <span>Exports média</span>
            <strong>{status.ops24h.exports.avgLatencyMs}ms</strong>
          </div>
          <div className='status-item'>
            <span>Exports erro</span>
            <strong>{status.ops24h.exports.errors}</strong>
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Workflow editorial de evidencias' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Draft</span>
            <strong>{status.ops24h.evidences.draft}</strong>
          </div>
          <div className='status-item'>
            <span>Review</span>
            <strong>{status.ops24h.evidences.review}</strong>
          </div>
          <div className='status-item'>
            <span>Published (24h)</span>
            <strong>{status.ops24h.evidences.published24h}</strong>
          </div>
        </div>
        <Link className='ui-button' href='/admin/universes'>
          Abrir universos (fila de revisao por universo)
        </Link>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Fila coletiva (24h)' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Itens em review</span>
            <strong>{status.ops24h.collectiveReview.review}</strong>
          </div>
          <div className='status-item'>
            <span>Promocoes 24h</span>
            <strong>{status.ops24h.collectiveReview.promotions24h}</strong>
          </div>
        </div>
      </Card>
      <Card className='stack'>
        <SectionHeader title='Tutor Chat (24h)' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Mensagens</span>
            <strong>{status.ops24h.tutor.messages24h}</strong>
          </div>
          <div className='status-item'>
            <span>Insufficient</span>
            <strong>
              {status.ops24h.tutor.insufficientCount} ({status.ops24h.tutor.insufficientPct}%)
            </strong>
          </div>
          <div className='status-item'>
            <span>Pontos concluídos</span>
            <strong>{status.ops24h.tutor.pointsCompleted24h}</strong>
          </div>
          <div className='status-item'>
            <span>Summaries gerados</span>
            <strong>{status.ops24h.tutor.summaries24h}</strong>
          </div>
          <div className='status-item'>
            <span>Exports de sessão</span>
            <strong>{status.ops24h.tutor.sessionExports24h}</strong>
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Distribuicao semanal' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Semana</span>
            <strong>{status.ops24h.distribution.weekKey}</strong>
          </div>
          <div className='status-item'>
            <span>Packs pendentes</span>
            <strong>{status.ops24h.distribution.packsPendingThisWeek}</strong>
          </div>
          <div className='status-item'>
            <span>Canais pendentes</span>
            <strong>{status.ops24h.distribution.channelsPendingThisWeek}</strong>
          </div>
          <div className='status-item'>
            <span>Ultimo cron</span>
            <strong>
              {status.ops24h.distribution.latestCronRunAt
                ? new Date(status.ops24h.distribution.latestCronRunAt).toLocaleString('pt-BR')
                : 'n/a'}
            </strong>
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Analytics de produto (24h)' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Page views</span>
            <strong>{status.ops24h.analytics.pageViews24h}</strong>
          </div>
          <div className='status-item'>
            <span>Share views</span>
            <strong>{status.ops24h.analytics.shareViews24h}</strong>
          </div>
          <div className='status-item'>
            <span>Share open app</span>
            <strong>{status.ops24h.analytics.shareOpenApp24h}</strong>
          </div>
          <div className='status-item'>
            <span>Universos com share_open_app</span>
            <strong>{status.ops24h.analytics.universesWithShareOpenApp}</strong>
          </div>
        </div>
        <div className='stack'>
          {status.ops24h.analytics.topUniversesByShareOpenApp.map((item) => (
            <article key={item.universeId} className='core-node'>
              <strong>{item.universeId}</strong>
              <p className='muted' style={{ margin: 0 }}>
                share_open_app: {item.shareOpenAppClicks}
              </p>
            </article>
          ))}
          {status.ops24h.analytics.topUniversesByShareOpenApp.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem eventos share_open_app nas ultimas 24h.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Qualidade de documentos' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>Score médio global</span>
            <strong>{status.ops24h.quality.avgTextQualityScore}</strong>
          </div>
          <div className='status-item'>
            <span>Docs com score</span>
            <strong>{status.ops24h.quality.docsScored}</strong>
          </div>
        </div>
        <div className='stack'>
          {status.ops24h.quality.worstUniverses.map((item) => (
            <article key={item.universeId} className='core-node'>
              <strong>
                {item.title} ({item.slug})
              </strong>
              <p className='muted' style={{ margin: 0 }}>
                score médio: {item.avgScore}
              </p>
              <a className='ui-button' href={`/admin/universes/${item.universeId}/docs/qualidade`}>
                Abrir docs problemáticos
              </a>
            </article>
          ))}
          {status.ops24h.quality.worstUniverses.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem dados de qualidade suficientes ainda.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Runtime' />
        <div className='status-grid'>
          <div className='status-item'>
            <span>DB</span>
            <Carimbo variant={status.db.state === 'ok' ? 'default' : 'alert'}>
              {`${status.db.state.toUpperCase()} - ${status.db.message}`}
            </Carimbo>
          </div>
          <div className='status-item'>
            <span>Storage</span>
            <Carimbo variant={status.storage.state === 'ok' ? 'default' : 'alert'}>
              {`${status.storage.state.toUpperCase()} - ${status.storage.message}`}
            </Carimbo>
          </div>
          <div className='status-item'>
            <span>Rate limit</span>
            <StatusChip ok={status.rateLimit.enabled} label={status.rateLimit.enabled ? 'ativo' : 'desligado'} />
          </div>
          <div className='status-item'>
            <span>Redis</span>
            <StatusChip ok={status.rateLimit.redisConfigured} label={status.rateLimit.redisConfigured ? 'on' : 'off'} />
          </div>
          <div className='status-item'>
            <span>Sentry</span>
            <strong>
              {status.sentry.configured ? 'configurado' : 'desligado'} ({status.sentry.environment})
            </strong>
          </div>
          <div className='status-item'>
            <span>DEV_ADMIN_BYPASS</span>
            <StatusChip ok={status.env.adminModeEnabled} label={status.env.adminModeEnabled ? 'ativo' : 'desligado'} />
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Env checklist (sem valores)' />
        <div className='status-grid'>
          {envEntries.map((entry) => (
            <div className='status-item' key={entry.label}>
              <span>{entry.label}</span>
              <StatusChip ok={entry.value} label={entry.value ? 'ok' : 'faltando'} />
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
