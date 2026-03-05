import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CopyPackTextButton } from '@/components/share/CopyPackTextButton';
import { buildInstagramCaption, buildTelegramText, buildWhatsAppText, type SharePackTemplateInput } from '@/lib/share/copyTemplates';
import { getUniverseById } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { saveDistributionSettingsAction, runWeeklyPackNowAction } from '@/app/actions/distribution';
import {
  getDistributionSettings,
  getLatestCronRun,
  listDistributionHistory,
  listRecentSharePackRuns,
} from '@/lib/share/scheduler';

type DistributionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; level?: string }>;
};

async function saveSettingsFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;
  const enabled = String(formData.get('weekly_pack_enabled') ?? '') === 'on';
  const day = Number(formData.get('weekly_day') ?? 1);
  const hour = Number(formData.get('weekly_hour') ?? 9);
  const timezone = String(formData.get('timezone') ?? 'America/Sao_Paulo').trim();
  const channels = formData
    .getAll('channels')
    .map((value) => String(value).trim())
    .filter(Boolean);

  const result = await saveDistributionSettingsAction({
    universeId,
    weeklyPackEnabled: enabled,
    weeklyDay: day,
    weeklyHour: hour,
    timezone,
    channels,
  });

  revalidatePath(`/admin/universes/${universeId}/distribution`);
  redirect(
    `/admin/universes/${universeId}/distribution?level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

async function runNowFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;
  const result = await runWeeklyPackNowAction(universeId);
  revalidatePath(`/admin/universes/${universeId}/distribution`);
  revalidatePath(`/admin/universes/${universeId}/share-pack`);
  redirect(
    `/admin/universes/${universeId}/distribution?level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

export default async function AdminUniverseDistributionPage({ params, searchParams }: DistributionPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  if (!universe) notFound();

  const [settings, history, runs, latestCronRun] = await Promise.all([
    getDistributionSettings(id),
    listDistributionHistory(id, 12),
    listRecentSharePackRuns(id, 10),
    getLatestCronRun(),
  ]);

  const config = settings ?? {
    weekly_pack_enabled: false,
    weekly_day: 1,
    weekly_hour: 9,
    timezone: 'America/Sao_Paulo',
    channels: ['instagram', 'whatsapp', 'telegram'],
  };
  const activeChannels = config.channels as string[];

  const message = String(sp.msg ?? '').trim();
  const level = String(sp.level ?? '').trim() === 'ok' ? 'ok' : 'error';

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Distribution' },
          ]}
          ariaLabel='Trilha distribution'
        />
        <SectionHeader
          title={`Rotina de distribuicao: ${universe.title}`}
          description='Configura cron semanal, roda manualmente e acompanha histórico de canais.'
          tag='Distribution'
        />
        <div className='toolbar-row'>
          <Carimbo>{config.weekly_pack_enabled ? 'semanal ativo' : 'semanal desligado'}</Carimbo>
          <Link className='ui-button' href={`/admin/universes/${id}/share-pack`}>
            Abrir share pack
          </Link>
        </div>
      </Card>

      {message ? (
        <Card>
          <p role='status' style={{ margin: 0, color: level === 'ok' ? 'var(--ok-0)' : 'var(--alert-0)' }}>
            {message}
          </p>
        </Card>
      ) : null}

      <Card className='stack'>
        <SectionHeader title='Configuracoes semanais' />
        <form action={saveSettingsFormAction} className='stack'>
          <input type='hidden' name='universe_id' value={id} />
          <label className='core-node'>
            <input type='checkbox' name='weekly_pack_enabled' defaultChecked={config.weekly_pack_enabled} /> Ativar pack semanal
          </label>
          <div className='toolbar-row'>
            <label>
              <span>Dia (ISO 1-7)</span>
              <input name='weekly_day' type='number' min={1} max={7} defaultValue={config.weekly_day} style={{ minHeight: 36, width: 120 }} />
            </label>
            <label>
              <span>Hora local</span>
              <input name='weekly_hour' type='number' min={0} max={23} defaultValue={config.weekly_hour} style={{ minHeight: 36, width: 120 }} />
            </label>
            <label>
              <span>Timezone</span>
              <input name='timezone' defaultValue={config.timezone} style={{ minHeight: 36, width: 220 }} />
            </label>
          </div>
          <div className='toolbar-row'>
            {(['instagram', 'whatsapp', 'telegram', 'twitter'] as const).map((channel) => (
              <label key={channel} className='core-node'>
                <input type='checkbox' name='channels' value={channel} defaultChecked={activeChannels.includes(channel)} /> {channel}
              </label>
            ))}
          </div>
          <div className='toolbar-row'>
            <button className='ui-button' type='submit'>
              Salvar configuracao
            </button>
          </div>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Execucao' description='Disparo manual e status da ultima execucao cron global.' />
        <div className='toolbar-row'>
          <form action={runNowFormAction}>
            <input type='hidden' name='universe_id' value={id} />
            <button className='ui-button' type='submit'>
              Rodar agora
            </button>
          </form>
          <span className='muted'>
            Último cron: {latestCronRun ? `${latestCronRun.universe_id} @ ${new Date(latestCronRun.created_at).toLocaleString('pt-BR')}` : 'n/a'}
          </span>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Historico (12 semanas)' />
        <div className='stack'>
          {history.map((entry) => {
            const statuses = entry.posts.map((post) => `${post.channel}:${post.status}`).join(' | ') || 'sem canais';
            const templateInput: SharePackTemplateInput = {
              universeSlug: universe.slug,
              universeTitle: universe.title,
              weekKey: entry.pack.week_key,
              title: entry.pack.title,
              note: entry.pack.note ?? null,
              items: entry.pack.items ?? [],
            };
            return (
              <article key={entry.pack.id} className='core-node'>
                <div className='toolbar-row'>
                  <strong>{entry.pack.week_key}</strong>
                  <Carimbo>{entry.pack.is_pinned ? 'pinned' : 'unpinned'}</Carimbo>
                  <span className='muted'>{statuses}</span>
                </div>
                <div className='toolbar-row'>
                  <Link className='ui-button' href={`/admin/universes/${id}/share-pack?week=${encodeURIComponent(entry.pack.week_key)}`}>
                    Abrir semana
                  </Link>
                  <a className='ui-button' href={`/c/${universe.slug}/s`} target='_blank' rel='noreferrer'>
                    Abrir vitrine
                  </a>
                  <CopyPackTextButton text={buildInstagramCaption(templateInput)} label='Copiar Instagram' />
                  <CopyPackTextButton text={buildWhatsAppText(templateInput)} label='Copiar WhatsApp' />
                  <CopyPackTextButton text={buildTelegramText(templateInput)} label='Copiar Telegram' />
                </div>
              </article>
            );
          })}
          {history.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem semanas registradas ainda.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Runs recentes' />
        <div className='stack'>
          {runs.map((run) => (
            <article key={run.id} className='core-node'>
              <div className='toolbar-row'>
                <Carimbo variant={run.ok ? 'default' : 'alert'}>{run.ok ? 'ok' : 'erro'}</Carimbo>
                <strong>{`${run.run_kind} ${run.week_key}`}</strong>
                <span className='muted'>{new Date(run.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(run.summary, null, 2)}</pre>
            </article>
          ))}
          {runs.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem runs registrados.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
