import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, getUniverseById, slugify } from '@/lib/admin/db';

type AdminUniverseMetaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function updateUniverseAction(formData: FormData) {
  'use server';
  const db = getAdminDb();
  if (!db) return;

  const id = String(formData.get('id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const coverUrl = String(formData.get('cover_url') ?? '').trim();
  const uiTheme = String(formData.get('ui_theme') ?? '').trim();
  const slugInput = String(formData.get('slug') ?? '').trim();
  const published = formData.get('published') === 'on';

  if (!id || !title) return;

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
      published,
    })
    .eq('id', id);

  revalidatePath(`/admin/universes/${id}`);
  revalidatePath('/admin/universes');
}

export default async function AdminUniverseMetaPage({ params }: AdminUniverseMetaPageProps) {
  const { id } = await params;
  const universe = await getUniverseById(id);
  const configured = Boolean(getAdminDb());

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
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type='checkbox' name='published' defaultChecked={universe.published} />
            Publicado
          </label>
          <button className='ui-button' type='submit' disabled={!configured}>
            Salvar metadados
          </button>
        </form>
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/nodes`}>
            Gerenciar nos
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/docs`}>
            Gerenciar docs
          </Link>
        </div>
      </Card>
    </main>
  );
}
