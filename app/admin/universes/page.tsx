import { spawnSync } from 'node:child_process';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, hasAdminWriteAccess, listUniverses, slugify } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

async function createUniverseAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, 'admin/universes/create');
  if (!rl.ok) {
    redirect(`/admin/universes?rl=${rl.retryAfterSec}`);
  }

  const db = getAdminDb();
  if (!db) return;

  const title = String(formData.get('title') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const publishNow = formData.get('publish_now') === 'on';

  if (!title) return;

  const slug = slugify(slugRaw || title);
  if (!slug) return;

  await db.from('universes').insert({
    title,
    slug,
    summary: summary || 'Resumo inicial do universo.',
    published_at: publishNow ? new Date().toISOString() : null,
    published: publishNow,
  });

  revalidatePath('/admin/universes');
}

async function seedDemoUniverseAction() {
  'use server';
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, 'admin/universes/seed_demo');
  if (!rl.ok) {
    redirect(`/admin/universes?rl=${rl.retryAfterSec}`);
  }

  const result = spawnSync(process.execPath, ['tools/seed-demo.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DEMO_PUBLISH: '1',
    },
    encoding: 'utf8',
  });

  revalidatePath('/admin/universes');
  if (result.status !== 0) {
    redirect('/admin/universes?demo=error');
  }
  redirect('/admin/universes?demo=ok');
}

type AdminUniversesPageProps = {
  searchParams: Promise<{ rl?: string; demo?: string }>;
};

export default async function AdminUniversesPage({ searchParams }: AdminUniversesPageProps) {
  const sp = await searchParams;
  const universes = await listUniverses();
  const canWrite = await hasAdminWriteAccess();
  const configured = Boolean(getAdminDb());
  const retrySec = Number(sp.rl ?? 0);
  const demoStatus = String(sp.demo ?? '');

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
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes/new'>
            Novo universo (wizard)
          </Link>
          <Link className='ui-button' href='/admin/universes/featured'>
            Gerir featured/focus
          </Link>
        </div>
        {!configured ? (
          <p className='muted' style={{ margin: 0 }}>
            Configure <code>SUPABASE_SERVICE_ROLE_KEY</code> para habilitar escrita no admin.
          </p>
        ) : null}
        {!canWrite ? (
          <p className='muted' style={{ margin: 0 }}>
            Seu perfil e somente leitura nesta area.
          </p>
        ) : null}
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
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
            <input type='checkbox' name='publish_now' />
            Publicar imediatamente
          </label>
          <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
            Criar universo
          </button>
        </form>
        <hr style={{ width: '100%', borderColor: 'var(--line-1)' }} />
        <SectionHeader
          title='Atalho demo'
          description='Cria/atualiza o universo vitrine "Poluicao em Volta Redonda" com seed idempotente.'
        />
        {demoStatus === 'ok' ? (
          <p className='muted' role='status' style={{ margin: 0 }}>
            Universo demo criado/atualizado com sucesso.
          </p>
        ) : null}
        {demoStatus === 'error' ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Falha ao executar seed demo. Rode `npm run demo:seed` no terminal para diagnostico.
          </p>
        ) : null}
        <form action={seedDemoUniverseAction}>
          <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
            Criar/Atualizar DEMO Poluicao VR
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
                {universe.slug}{' '}
                {universe.published_at
                  ? `(publicado em ${new Date(universe.published_at).toLocaleString('pt-BR')})`
                  : '(nao publicado)'}
              </p>
              <div className='toolbar-row'>
                {universe.is_featured ? <span className='badge'>featured</span> : null}
                {universe.focus_override ? <span className='badge'>foco editorial</span> : null}
                {universe.focus_note ? <span className='badge'>focus note</span> : null}
                <span className='badge'>{`rank:${universe.featured_rank}`}</span>
              </div>
              <div className='toolbar-row'>
                <Link className='ui-button' href={`/admin/universes/${universe.id}`}>
                  Editar meta
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/checklist`}>
                  Checklist
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/highlights`}>
                  Highlights
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/nodes`}>
                  Gerenciar nos
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/docs`}>
                  Gerenciar docs
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/links`}>
                  Curadoria links
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/sprint`}>
                  Sprint
                </Link>
                <Link className='ui-button' href={`/admin/universes/${universe.id}/demo`}>
                  Console demo
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

