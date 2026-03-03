import { Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getSystemStatus } from '@/lib/status/health';

export const dynamic = 'force-dynamic';

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return <Carimbo variant={ok ? 'default' : 'alert'}>{`${label}: ${ok ? 'ok' : 'pendente'}`}</Carimbo>;
}

async function StatusContent() {
  const status = await getSystemStatus();
  const envEntries: Array<{ label: string; value: boolean }> = [
    { label: 'NEXT_PUBLIC_SUPABASE_URL', value: status.env.nextPublicSupabaseUrl },
    { label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: status.env.nextPublicSupabaseAnonKey },
    { label: 'SUPABASE_SERVICE_ROLE_KEY', value: status.env.supabaseServiceRoleKey },
    { label: 'SUPABASE_PROJECT_REF', value: status.env.supabaseProjectRef },
    { label: 'SUPABASE_DB_PASSWORD', value: status.env.supabaseDbPassword },
    { label: 'SUPABASE_ACCESS_TOKEN', value: status.env.supabaseAccessToken },
    { label: 'VERCEL_TOKEN', value: status.env.vercelToken },
    { label: 'VERCEL_ORG_ID', value: status.env.vercelOrgId },
    { label: 'VERCEL_PROJECT_ID', value: status.env.vercelProjectId },
  ];

  return (
    <div className='stack'>
      <Card className='stack'>
        <SectionHeader title='Ambiente' description='Checklist de variaveis sem expor valores sensiveis.' />
        <div className='status-grid' role='list' aria-label='Status das variaveis de ambiente'>
          {envEntries.map((entry) => (
            <div className='status-item' role='listitem' key={entry.label}>
              <span>{entry.label}</span>
              <StatusChip ok={entry.value} label={entry.value ? 'ok' : 'faltando'} />
            </div>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Infra' description='Saude de banco e storage.' />
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
            <span>ADMIN_MODE</span>
            <StatusChip ok={status.env.adminModeEnabled} label={status.env.adminModeEnabled ? 'ativo' : 'desligado'} />
          </div>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Contagens' description='Volumes atuais de registros nucleares.' />
        <div className='status-grid' role='list' aria-label='Contagem de registros'>
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
        <SectionHeader
          title='Status do Sistema'
          description='Painel rapido de ambiente, conectividade e volume de dados.'
          tag='Ops'
        />
      </Card>
      <Suspense fallback={<LoadingBlock />}>
        <StatusContent />
      </Suspense>
    </main>
  );
}
