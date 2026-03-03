import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, listUniverses, slugify } from '@/lib/admin/db';

async function createUniverseAction(formData: FormData) {
  'use server';

  const db = getAdminDb();
  if (!db) return;

  const title = String(formData.get('title') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const published = formData.get('published') === 'on';

  if (!title) return;

  const slug = slugify(slugRaw || title);
  if (!slug) return;

  await db.from('universes').insert({
    title,
    slug,
    summary: summary || 'Resumo inicial do universo.',
    published,
  });

  revalidatePath('/admin/universes');
}

export default async function AdminUniversesPage() {
  const universes = await listUniverses();
  const configured = Boolean(getAdminDb());

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { label: 'Universes' },
          ]}
          ariaLabel='Trilha admin universes'
        />
        <SectionHeader title='Universes' description='Listagem e criacao de universos do MVP.' tag='Admin' />
        {!configured ? (
          <p className='muted' style={{ margin: 0 }}>
            Configure <code>SUPABASE_SERVICE_ROLE_KEY</code> para habilitar escrita no admin.
          </p>
        ) : null}
      </Card>

      <Card className='stack'>
        <SectionHeader title='Criar universo' />
        <form action={createUniverseAction} className='stack'>
          <label>
            <span>Titulo</span>
            <input name='title' required style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Slug (opcional)</span>
            <input name='slug' placeholder='gerado automaticamente' style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Resumo</span>
            <textarea name='summary' rows={3} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type='checkbox' name='published' />
            Publicado
          </label>
          <button className='ui-button' type='submit' disabled={!configured}>
            Criar universo
          </button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Universos cadastrados' />
        <div className='stack'>
          {universes.map((universe) => (
            <article key={universe.id} className='core-node'>
              <strong>{universe.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {universe.slug} {universe.published ? '(publicado)' : '(rascunho)'}
              </p>
              <div className='toolbar-row'>
                <Link className='ui-button' href={`/admin/universes/${universe.id}`}>
                  Editar meta
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/nodes`}>
                  Gerenciar nos
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/docs`}>
                  Gerenciar docs
                </Link>
              </div>
            </article>
          ))}
          {universes.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum universo encontrado.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
