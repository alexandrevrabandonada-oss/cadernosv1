import Link from 'next/link';
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, getUniverseById, hasAdminWriteAccess, slugify } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { deleteExportById, listUniverseExports, setExportPublicFlag } from '@/lib/export/service';
import { regenerateQuickStartTrail } from '@/lib/onboarding/quickstart';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

type AdminUniverseMetaPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    rl?: string;
  }>;
};

async function updateUniverseAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;

  const id = String(formData.get('id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const coverUrl = String(formData.get('cover_url') ?? '').trim();
  const uiTheme = String(formData.get('ui_theme') ?? '').trim();
  const slugInput = String(formData.get('slug') ?? '').trim();

  if (!id || !title) return;
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${id}/update`);
  if (!rl.ok) {
    redirect(`/admin/universes/${id}?rl=${rl.retryAfterSec}`);
  }

  const slug = slugify(slugInput || title);
  if (!slug) return;

  await db
    .from('universes')
    .update({
      title,
      slug,
      summary: summary || 'Resumo inicial do universo.',
      cover_url: coverUrl || null,
      ui_theme: uiTheme || null,
    })
    .eq('id', id);

  revalidatePath(`/admin/universes/${id}`);
  revalidatePath('/admin/universes');
}

async function publishUniverseAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${id}/publish`);
  if (!rl.ok) {
    redirect(`/admin/universes/${id}?rl=${rl.retryAfterSec}`);
  }

  await db.from('universes').update({ published_at: new Date().toISOString(), published: true }).eq('id', id);
  revalidatePath(`/admin/universes/${id}`);
  revalidatePath('/admin/universes');
  revalidatePath('/');
}

async function unpublishUniverseAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${id}/unpublish`);
  if (!rl.ok) {
    redirect(`/admin/universes/${id}?rl=${rl.retryAfterSec}`);
  }

  await db.from('universes').update({ published_at: null, published: false }).eq('id', id);
  revalidatePath(`/admin/universes/${id}`);
  revalidatePath('/admin/universes');
  revalidatePath('/');
}

async function toggleExportPublicAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const exportId = String(formData.get('export_id') ?? '').trim();
  const next = String(formData.get('next') ?? '') === '1';
  if (!universeId || !exportId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/exports/toggle`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}?rl=${rl.retryAfterSec}`);
  }
  await setExportPublicFlag(exportId, next);
  revalidatePath(`/admin/universes/${universeId}`);
}

async function deleteExportAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const exportId = String(formData.get('export_id') ?? '').trim();
  if (!universeId || !exportId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/exports/delete`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}?rl=${rl.retryAfterSec}`);
  }
  await deleteExportById(exportId);
  revalidatePath(`/admin/universes/${universeId}`);
}

async function regenerateQuickStartAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('id') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!universeId || !slug) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/quickstart/regenerate`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}?rl=${rl.retryAfterSec}`);
  }

  await regenerateQuickStartTrail(universeId, slug);
  revalidatePath(`/admin/universes/${universeId}`);
  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/trilhas`);
}

export default async function AdminUniverseMetaPage({ params, searchParams }: AdminUniverseMetaPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const canWrite = await hasAdminWriteAccess();
  const configured = Boolean(getAdminDb());
  const retrySec = Number(sp.rl ?? 0);
  const exports = await listUniverseExports(id);

  if (!universe) {
    notFound();
  }

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { label: universe.slug },
          ]}
          ariaLabel='Trilha admin universe meta'
        />
        <SectionHeader
          title={`Editar universo: ${universe.title}`}
          description='Atualizacao de metadados do universo.'
          tag='Meta'
        />
      </Card>

      <Card className='stack'>
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
        <form action={updateUniverseAction} className='stack'>
          <input type='hidden' name='id' value={universe.id} />
          <label>
            <span>Titulo</span>
            <input name='title' defaultValue={universe.title} required style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Slug</span>
            <input name='slug' defaultValue={universe.slug} required style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Resumo</span>
            <textarea name='summary' defaultValue={universe.summary} rows={4} style={{ width: '100%' }} />
          </label>
          <label>
            <span>Cover URL (opcional)</span>
            <input
              name='cover_url'
              defaultValue={universe.cover_url ?? ''}
              style={{ width: '100%', minHeight: 40 }}
            />
          </label>
          <label>
            <span>UI Theme (opcional)</span>
            <input
              name='ui_theme'
              defaultValue={universe.ui_theme ?? ''}
              style={{ width: '100%', minHeight: 40 }}
            />
          </label>
          <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
            Salvar metadados
          </button>
        </form>
        <Card className='stack'>
          <SectionHeader title='Visibilidade publica' description='Publicar torna o universo visivel e consultavel no catalogo publico.' />
          <p className='muted' style={{ margin: 0 }}>
            {universe.published_at
              ? `Publicado em: ${new Date(universe.published_at).toLocaleString('pt-BR')}`
              : 'Universo ainda nao publicado.'}
          </p>
          <div className='toolbar-row'>
            {universe.published_at ? (
              <form action={unpublishUniverseAction}>
                <input type='hidden' name='id' value={universe.id} />
                <button className='ui-button' type='submit' data-variant='ghost' disabled={!configured || !canWrite}>
                  Despublicar
                </button>
              </form>
            ) : (
              <form action={publishUniverseAction}>
                <input type='hidden' name='id' value={universe.id} />
                <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                  Publicar
                </button>
              </form>
            )}
          </div>
        </Card>
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/checklist`}>
            Checklist do Universo
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/assistido`}>
            Curadoria Assistida
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/nodes`}>
            Gerenciar nos
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/docs`}>
            Gerenciar docs
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/links`}>
            Curadoria de links
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/trilhas`}>
            Editar trilhas
          </Link>
          <form action={regenerateQuickStartAction}>
            <input type='hidden' name='id' value={universe.id} />
            <input type='hidden' name='slug' value={universe.slug} />
            <button className='ui-button' type='submit' data-variant='ghost' disabled={!configured || !canWrite}>
              Regerar Comece Aqui
            </button>
          </form>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Exports do universo' description='Controle de visibilidade e remocao de dossies/cadernos gerados.' />
        <div className='stack'>
          {exports.map((item) => (
            <article key={item.id} className='core-node'>
              <strong>{item.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {item.kind} | {item.format.toUpperCase()} | {new Date(item.created_at).toLocaleString('pt-BR')}
              </p>
              <p className='muted' style={{ margin: 0 }}>
                publico: {item.is_public ? 'sim' : 'nao'} | caminho: {item.storage_path}
              </p>
              <div className='toolbar-row'>
                <a className='ui-button' href={`/c/${universe.slug}/exports/${item.id}`} target='_blank' rel='noreferrer'>
                  Abrir pagina publica
                </a>
                <form action={toggleExportPublicAction}>
                  <input type='hidden' name='universe_id' value={universe.id} />
                  <input type='hidden' name='export_id' value={item.id} />
                  <input type='hidden' name='next' value={item.is_public ? '0' : '1'} />
                  <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                    {item.is_public ? 'Tornar privado' : 'Tornar publico'}
                  </button>
                </form>
                <form action={deleteExportAction}>
                  <input type='hidden' name='universe_id' value={universe.id} />
                  <input type='hidden' name='export_id' value={item.id} />
                  <button className='ui-button' type='submit' data-variant='ghost' disabled={!configured || !canWrite}>
                    Excluir
                  </button>
                </form>
              </div>
            </article>
          ))}
          {exports.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum export gerado para este universo.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
