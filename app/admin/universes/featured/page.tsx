import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, hasAdminWriteAccess, listUniverses } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

async function updateFeaturedAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/featured`);
  if (!rl.ok) {
    redirect(`/admin/universes/featured?rl=${rl.retryAfterSec}`);
  }

  const db = getAdminDb();
  if (!db) {
    redirect('/admin/universes/featured?saved=seed');
  }

  const isFeatured = formData.get('is_featured') === 'on';
  const focusOverride = formData.get('focus_override') === 'on';
  const featuredRank = Number(formData.get('featured_rank') ?? 0);
  const focusNote = String(formData.get('focus_note') ?? '').trim();

  await db
    .from('universes')
    .update({
      is_featured: isFeatured,
      featured_rank: Number.isFinite(featuredRank) ? featuredRank : 0,
      focus_override: focusOverride,
      focus_note: focusNote || null,
    })
    .eq('id', universeId);

  revalidatePath('/');
  revalidatePath('/admin/universes');
  revalidatePath('/admin/universes/featured');
  redirect('/admin/universes/featured?saved=1');
}

type FeaturedPageProps = {
  searchParams: Promise<{ rl?: string; saved?: string }>;
};

export default async function AdminUniversesFeaturedPage({ searchParams }: FeaturedPageProps) {
  const sp = await searchParams;
  const universes = await listUniverses();
  const canWrite = await hasAdminWriteAccess();
  const configured = Boolean(getAdminDb());
  const retrySec = Number(sp.rl ?? 0);
  const saved = String(sp.saved ?? '');

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { label: 'Featured / Focus' },
          ]}
          ariaLabel='Trilha admin vitrine'
        />
        <SectionHeader
          title='Featured / Focus'
          description='Gerencie a ordem editorial da Home usando apenas universos publicados e sinais reais.'
          tag='Catalogo vivo'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes'>
            Voltar aos universos
          </Link>
        </div>
        {!configured ? (
          <p className='muted' style={{ margin: 0 }}>
            Ambiente sem service role: o painel funciona como leitura do seed/editorial, sem persistir alteracoes.
          </p>
        ) : null}
        {!canWrite ? (
          <p className='muted' style={{ margin: 0 }}>
            Seu perfil esta em modo somente leitura nesta area.
          </p>
        ) : null}
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas alteracoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
        {saved === '1' ? (
          <p className='muted' role='status' style={{ margin: 0 }}>
            Vitrine atualizada. A Home vai reordenar foco e destaque com base nesses campos.
          </p>
        ) : null}
        {saved === 'seed' ? (
          <p className='muted' role='status' style={{ margin: 0 }}>
            Seed sem persistencia: use esta tela para validar a ordem editorial no ambiente de teste.
          </p>
        ) : null}
      </Card>

      <Card className='stack'>
        <SectionHeader
          title='Regras da Home'
          description='Ordem: focus override publicado > featured por rank > outros publicados com mais sinais reais.'
        />
        <div className='toolbar-row'>
          <span className='badge'>focus_override</span>
          <span className='badge'>is_featured</span>
          <span className='badge'>featured_rank</span>
          <span className='badge'>focus_note</span>
        </div>
      </Card>

      <div className='stack'>
        {universes.map((universe) => (
          <Card key={universe.id} className='stack'>
            <div className='stack' style={{ gap: '0.35rem' }}>
              <div className='toolbar-row'>
                <strong>{universe.title}</strong>
                {universe.published ? <span className='badge'>publicado</span> : <span className='badge'>rascunho</span>}
                {universe.is_featured ? <span className='badge'>featured</span> : null}
                {universe.focus_override ? <span className='badge'>foco editorial</span> : null}
              </div>
              <p className='muted' style={{ margin: 0 }}>
                {universe.slug} · rank {universe.featured_rank}
              </p>
              <p className='muted' style={{ margin: 0 }}>{universe.summary}</p>
            </div>
            <form action={updateFeaturedAction} className='stack'>
              <input type='hidden' name='universe_id' value={universe.id} />
              <div className='toolbar-row'>
                <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <input type='checkbox' name='is_featured' defaultChecked={universe.is_featured} disabled={!configured || !canWrite} />
                  Featured
                </label>
                <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <input type='checkbox' name='focus_override' defaultChecked={universe.focus_override} disabled={!configured || !canWrite} />
                  Foco editorial
                </label>
              </div>
              <label>
                <span>Featured rank</span>
                <input
                  type='number'
                  min={0}
                  step={1}
                  name='featured_rank'
                  defaultValue={universe.featured_rank}
                  disabled={!configured || !canWrite}
                  style={{ width: '100%', minHeight: 40 }}
                />
              </label>
              <label>
                <span>Focus note</span>
                <textarea
                  name='focus_note'
                  rows={3}
                  defaultValue={universe.focus_note ?? ''}
                  disabled={!configured || !canWrite}
                  style={{ width: '100%' }}
                />
              </label>
              <div className='toolbar-row'>
                <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                  Salvar vitrine
                </button>
                <Link className='ui-button' href={`/admin/universes/${universe.id}`}>
                  Abrir meta completa
                </Link>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </main>
  );
}
