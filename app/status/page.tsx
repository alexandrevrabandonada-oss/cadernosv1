import { Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getPublicSystemStatus } from '@/lib/status/health';

export const dynamic = 'force-dynamic';

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return <Carimbo variant={ok ? 'default' : 'alert'}>{`${label}: ${ok ? 'ok' : 'pendente'}`}</Carimbo>;
}

async function PublicStatusContent() {
  const status = await getPublicSystemStatus();
  return (
    <div className='stack'>
      <Card className='stack'>
        <SectionHeader title='Infra (sanitizado)' description='Visao publica sem detalhes sensiveis.' />
        <div className='status-grid' role='list' aria-label='Status de infraestrutura'>
          <div className='status-item' role='listitem'>
            <span>DB</span>
            <Carimbo variant={status.db.state === 'ok' ? 'default' : 'alert'}>
              {`${status.db.state.toUpperCase()} - ${status.db.message}`}
            </Carimbo>
          </div>
          <div className='status-item' role='listitem'>
            <span>Storage</span>
            <Carimbo variant={status.storage.state === 'ok' ? 'default' : 'alert'}>
              {`${status.storage.state.toUpperCase()} - ${status.storage.message}`}
            </Carimbo>
          </div>
          <div className='status-item' role='listitem'>
            <span>Sentry</span>
            <StatusChip ok={status.sentry.configured} label={status.sentry.configured ? 'ativo' : 'inativo'} />
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Volumes basicos' />
        <div className='status-grid' role='list' aria-label='Contagens basicas'>
          <div className='status-item' role='listitem'>
            <span>Universos</span>
            <strong>{status.counts.universes ?? '-'}</strong>
          </div>
          <div className='status-item' role='listitem'>
            <span>Documentos</span>
            <strong>{status.counts.documents ?? '-'}</strong>
          </div>
          <div className='status-item' role='listitem'>
            <span>Chunks</span>
            <strong>{status.counts.chunks ?? '-'}</strong>
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Rate Limit' />
        <div className='status-grid' role='list' aria-label='Rate limit'>
          <div className='status-item' role='listitem'>
            <span>RATE_LIMIT_ENABLED</span>
            <StatusChip ok={status.rateLimit.enabled} label={status.rateLimit.enabled ? 'ativo' : 'desligado'} />
          </div>
          <div className='status-item' role='listitem'>
            <span>Redis</span>
            <StatusChip ok={status.rateLimit.redisConfigured} label={status.rateLimit.redisConfigured ? 'configurado' : 'off'} />
          </div>
        </div>
        <p className='muted' style={{ margin: 0 }}>
          Atualizado em {new Date(status.generatedAt).toLocaleString('pt-BR')}.
        </p>
      </Card>
    </div>
  );
}

export default function StatusPage() {
  return (
    <main>
      <Card className='stack'>
        <SectionHeader title='Status do Sistema' description='Painel publico sanitizado.' tag='Ops' />
      </Card>
      <Suspense fallback={<LoadingBlock />}>
        <PublicStatusContent />
      </Suspense>
    </main>
  );
}
