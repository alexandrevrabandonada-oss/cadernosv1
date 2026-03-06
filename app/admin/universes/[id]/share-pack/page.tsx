import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Carimbo } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SharePackOpsClient } from '@/components/share/SharePackOpsClient';
import { CopyPackTextButton } from '@/components/share/CopyPackTextButton';
import { ShareButton } from '@/components/share/ShareButton';
import { generateWeeklySharePackAction, setSharePackPinnedAction } from '@/app/actions/sharePack';
import { setSharePackPostStatusAction } from '@/app/actions/distribution';
import { getUniverseById } from '@/lib/admin/db';
import { createSharedNotebook } from '@/lib/shared-notebooks/notebooks';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import {
  buildSharePackCopyText,
  generateWeeklyPack,
  getWeekKey,
  getWeeklyPack,
  listWeeklyPacks,
} from '@/lib/share/pack';
import {
  buildInstagramCaption,
  buildTelegramText,
  buildTwitterThread,
  buildWhatsAppText,
  type SharePackTemplateInput,
} from '@/lib/share/copyTemplates';
import { getDefaultSharePackChecklistChecks, getSharePackChecklist } from '@/lib/share/checklist';
import { listSharePackPosts } from '@/lib/share/scheduler';

type SharePackPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; level?: string; week?: string }>;
};

async function generatePackFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const week = String(formData.get('week') ?? '').trim();
  if (!universeId) return;
  const result = await generateWeeklySharePackAction(universeId, { weekKey: week || undefined });
  revalidatePath(`/admin/universes/${universeId}/share-pack`);
  redirect(
    `/admin/universes/${universeId}/share-pack?week=${encodeURIComponent(week || '')}&level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

async function pinPackFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const packId = String(formData.get('pack_id') ?? '').trim();
  const nextPinned = String(formData.get('next_pinned') ?? '') === '1';
  if (!universeId || !packId) return;
  const result = await setSharePackPinnedAction(packId, nextPinned);
  revalidatePath(`/admin/universes/${universeId}/share-pack`);
  redirect(
    `/admin/universes/${universeId}/share-pack?level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

async function createWeeklyBaseFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const universeSlug = String(formData.get('universe_slug') ?? '').trim();
  const universeTitle = String(formData.get('universe_title') ?? '').trim();
  const week = String(formData.get('week') ?? '').trim();
  if (!universeId || !universeSlug) return;
  try {
    const notebook = await createSharedNotebook({
      universeSlug,
      title: `Base da Semana ${week || ''}`.trim(),
      summary: `Base semanal derivada do Share Pack de ${universeTitle}${week ? ` (${week})` : ''}. Use este coletivo para revisar, adicionar notas curtas e subir itens para a fila editorial.`,
      visibility: 'team',
      templateId: 'weekly_base',
      templateMeta: {
        sharePackWeek: week || null,
        sharePackPath: `/admin/universes/${universeId}/share-pack?week=${encodeURIComponent(week)}`,
      },
    });
    revalidatePath(`/admin/universes/${universeId}/share-pack`);
    redirect(`/c/${universeSlug}/coletivos/${notebook.slug}`);
  } catch {
    redirect(`/admin/universes/${universeId}/share-pack?week=${encodeURIComponent(week)}&level=error&msg=${encodeURIComponent('Falha ao criar Base da Semana.')}`);
  }
}

async function setPostStatusFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const packId = String(formData.get('pack_id') ?? '').trim();
  const week = String(formData.get('week') ?? '').trim();
  const channel = String(formData.get('channel') ?? '').trim() as
    | 'instagram'
    | 'whatsapp'
    | 'telegram'
    | 'twitter'
    | 'other';
  const status = String(formData.get('status') ?? '').trim() as 'pending' | 'posted' | 'skipped';
  const postUrl = String(formData.get('post_url') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (!universeId || !packId || !channel || !status) return;
  const result = await setSharePackPostStatusAction({
    packId,
    universeId,
    channel,
    status,
    postUrl,
    note,
  });
  revalidatePath(`/admin/universes/${universeId}/share-pack`);
  redirect(
    `/admin/universes/${universeId}/share-pack?week=${encodeURIComponent(week)}&level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

export default async function AdminUniverseSharePackPage({ params, searchParams }: SharePackPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  if (!universe) notFound();

  const currentWeekKey = getWeekKey();
  const selectedWeekKey = String(sp.week ?? '').trim() || currentWeekKey;
  const [weeks, pack, preview] = await Promise.all([
    listWeeklyPacks(id, 12),
    getWeeklyPack(id, selectedWeekKey),
    generateWeeklyPack(id, { weekKey: selectedWeekKey }),
  ]);
  const posts = pack ? await listSharePackPosts(pack.id) : [];
  const renderedItems = pack?.items ?? preview?.items ?? [];
  const templateInput: SharePackTemplateInput = {
    universeSlug: universe.slug,
    universeTitle: universe.title,
    weekKey: selectedWeekKey,
    title: pack?.title ?? preview?.title ?? `Pack da semana — ${universe.title}`,
    note: pack?.note ?? preview?.note ?? null,
    items: renderedItems,
  };
  const copyText = buildSharePackCopyText({
    title: templateInput.title,
    note: templateInput.note,
    items: renderedItems.map((item) => ({
      label: `[${item.type}] ${item.label}`,
      url: item.url,
    })),
  });
  const checklistRow = pack ? await getSharePackChecklist(pack.id) : null;
  const checklist = checklistRow?.checks ?? getDefaultSharePackChecklistChecks();
  const captions = {
    instagram: buildInstagramCaption(templateInput),
    whatsapp: buildWhatsAppText(templateInput),
    telegram: buildTelegramText(templateInput),
    twitter: buildTwitterThread(templateInput),
  };

  const message = String(sp.msg ?? '').trim();
  const level = String(sp.level ?? '').trim() === 'ok' ? 'ok' : 'error';
  const postByChannel = new Map(posts.map((post) => [post.channel, post]));
  const channels: Array<'instagram' | 'whatsapp' | 'telegram' | 'twitter'> = [
    'instagram',
    'whatsapp',
    'telegram',
    'twitter',
  ];
  const doneCount = posts.filter((post) => post.status === 'posted' || post.status === 'skipped').length;

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Share Pack' },
          ]}
          ariaLabel='Trilha share pack'
        />
        <SectionHeader
          title={`Share Pack semanal: ${universe.title}`}
          description='Gera links canonicos prontos para postar com diversidade de itens do universo.'
          tag='Share'
        />
        <div className='toolbar-row'>
          <Carimbo>{`semana:${selectedWeekKey}`}</Carimbo>
          <Carimbo>{pack?.is_pinned ? 'fixado' : 'nao fixado'}</Carimbo>
          <Carimbo>{`canais concluidos:${doneCount}/${posts.length || 0}`}</Carimbo>
          <Link className='ui-button' href={`/admin/universes/${id}`}>
            Voltar ao universo
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/distribution`}>
            Abrir rotina
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
        <SectionHeader title='Semana' description='Escolha a semana do pack para revisar histórico e auditoria.' />
        <div className='toolbar-row'>
          {weeks.map((item) => (
            <Link
              key={item.id}
              className='ui-button'
              href={`/admin/universes/${id}/share-pack?week=${encodeURIComponent(item.week_key)}`}
              data-variant={item.week_key === selectedWeekKey ? undefined : 'ghost'}
            >
              {item.week_key}
            </Link>
          ))}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader
          title='Acoes'
          description='Gerar/regenerar pack da semana, fixar para nao mudar e copiar texto pronto.'
        />
        <div className='toolbar-row'>
          <form action={generatePackFormAction}>
            <input type='hidden' name='universe_id' value={id} />
            <input type='hidden' name='week' value={selectedWeekKey} />
            <button className='ui-button' type='submit' disabled={Boolean(pack?.is_pinned)}>
              {pack ? 'Regenerar pack da semana' : 'Gerar pack da semana'}
            </button>
          </form>
          {pack ? (
            <form action={pinPackFormAction}>
              <input type='hidden' name='universe_id' value={id} />
              <input type='hidden' name='pack_id' value={pack.id} />
              <input type='hidden' name='next_pinned' value={pack.is_pinned ? '0' : '1'} />
              <button className='ui-button' type='submit' data-variant='ghost'>
                {pack.is_pinned ? 'Desfixar pack' : 'Fixar pack'}
              </button>
            </form>
          ) : null}
          <CopyPackTextButton text={copyText} />
          <form action={createWeeklyBaseFormAction}>
            <input type='hidden' name='universe_id' value={id} />
            <input type='hidden' name='universe_slug' value={universe.slug} />
            <input type='hidden' name='universe_title' value={universe.title} />
            <input type='hidden' name='week' value={selectedWeekKey} />
            <button className='ui-button' type='submit' data-variant='ghost'>
              Gerar Base da Semana
            </button>
          </form>
        </div>
        {pack?.is_pinned ? (
          <p className='muted' style={{ margin: 0 }}>
            Pack fixado: a regeneracao esta bloqueada ate desfixar.
          </p>
        ) : null}
      </Card>

      <Card className='stack'>
        <SectionHeader
          title={pack ? pack.title : preview?.title ?? 'Pack ainda nao gerado'}
          description={pack?.note ?? preview?.note ?? 'Gere o pack para montar links canonicos automaticamente.'}
        />
        <div className='stack'>
          {renderedItems.map((item, index) => (
            <article key={`${item.type}-${item.id}`} className='core-node'>
              <div className='toolbar-row'>
                <Carimbo>{item.type}</Carimbo>
                <strong>
                  {index + 1}. {item.label}
                </strong>
                {item.note ? <span className='muted'>{item.note}</span> : null}
              </div>
              <p className='muted' style={{ margin: 0 }}>
                {item.url}
              </p>
              <div className='toolbar-row'>
                <a className='ui-button' href={item.url} target='_blank' rel='noreferrer'>
                  Abrir share page
                </a>
                <ShareButton url={item.url} title={item.label} text='Conteudo compartilhavel do Cadernos Vivos.' label='Copiar link' />
              </div>
            </article>
          ))}
          {renderedItems.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Sem itens disponiveis no momento. Rode a geracao depois de publicar e curar o universo.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Texto pronto' description='Use este texto para WhatsApp, Telegram e outras redes.' />
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{copyText}</pre>
      </Card>

      {pack ? (
        <Card className='stack'>
          <SectionHeader title='Postagem por canal' description='Auditoria por canal com status, timestamp e URL opcional.' />
          <div className='stack'>
            {channels.map((channel) => {
              const row = postByChannel.get(channel);
              const status = row?.status ?? 'pending';
              const postedAt = row?.posted_at ? new Date(row.posted_at).toLocaleString('pt-BR') : 'n/a';
              return (
                <article key={channel} className='core-node'>
                  <div className='toolbar-row'>
                    <strong>{channel}</strong>
                    <Carimbo>{status}</Carimbo>
                    <span className='muted'>{`posted_at: ${postedAt}`}</span>
                  </div>
                  <form action={setPostStatusFormAction} className='stack'>
                    <input type='hidden' name='universe_id' value={id} />
                    <input type='hidden' name='pack_id' value={pack.id} />
                    <input type='hidden' name='week' value={selectedWeekKey} />
                    <input type='hidden' name='channel' value={channel} />
                    <label>
                      <span>URL do post (opcional)</span>
                      <input
                        name='post_url'
                        defaultValue={row?.post_url ?? ''}
                        placeholder='https://instagram.com/...'
                        style={{ width: '100%', minHeight: 36 }}
                      />
                    </label>
                    <label>
                      <span>Nota (opcional)</span>
                      <input
                        name='note'
                        defaultValue={row?.note ?? ''}
                        placeholder='Comentário operacional'
                        style={{ width: '100%', minHeight: 36 }}
                      />
                    </label>
                    <div className='toolbar-row'>
                      <button className='ui-button' type='submit' name='status' value='posted'>
                        Marcar postado
                      </button>
                      <button className='ui-button' type='submit' name='status' value='skipped' data-variant='ghost'>
                        Marcar skipped
                      </button>
                      <button className='ui-button' type='submit' name='status' value='pending' data-variant='ghost'>
                        Desfazer
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        </Card>
      ) : null}

      {pack ? (
        <Card className='stack'>
          <SectionHeader
            title='Distribuicao'
            description='Legendas por canal, checklist de postagem e rotina semanal.'
          />
          <SharePackOpsClient
            packId={pack.id}
            universeId={id}
            universeSlug={universe.slug}
            sharePackPath={`/admin/universes/${id}/share-pack?week=${encodeURIComponent(selectedWeekKey)}`}
            checklist={checklist}
            captions={captions}
          />
        </Card>
      ) : null}
    </main>
  );
}


