import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Carimbo } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { autoPickHighlightsAction, publishShowcaseUniverseAction, saveHighlightsAction } from '@/app/actions/showcase';
import { getUniverseById } from '@/lib/admin/db';
import { getUniverseHighlights } from '@/lib/demo/highlights';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { getAdminDb } from '@/lib/admin/db';

type HighlightsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; level?: 'ok' | 'error' }>;
};

async function autoPickFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;
  const result = await autoPickHighlightsAction(universeId);
  revalidatePath(`/admin/universes/${universeId}/highlights`);
  redirect(
    `/admin/universes/${universeId}/highlights?level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

async function saveHighlightsFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;

  const evidenceIds = formData
    .getAll('evidence_ids')
    .map((value) => String(value))
    .filter(Boolean)
    .slice(0, 6);
  const eventIds = formData
    .getAll('event_ids')
    .map((value) => String(value))
    .filter(Boolean)
    .slice(0, 3);
  const questionPrompts = String(formData.get('question_prompts') ?? '');

  const result = await saveHighlightsAction({
    universeId,
    evidenceIdsCsv: evidenceIds.join(','),
    eventIdsCsv: eventIds.join(','),
    questionPromptsText: questionPrompts,
  });

  revalidatePath(`/admin/universes/${universeId}/highlights`);
  redirect(
    `/admin/universes/${universeId}/highlights?level=${result.ok ? 'ok' : 'error'}&msg=${encodeURIComponent(result.message)}`,
  );
}

async function publishShowcaseFormAction(formData: FormData) {
  'use server';
  await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const force = String(formData.get('force') ?? '') === 'on';
  if (!universeId) return;

  const result = await publishShowcaseUniverseAction({ universeId, force });
  revalidatePath(`/admin/universes/${universeId}/highlights`);
  revalidatePath(`/admin/universes/${universeId}`);
  revalidatePath(`/admin/universes/${universeId}/checklist`);
  revalidatePath('/admin/universes');
  revalidatePath('/');
  const failChecks = 'failChecks' in result ? result.failChecks : [];
  const universeSlug = 'universeSlug' in result ? result.universeSlug : null;

  if (result.ok) {
    if (universeSlug) revalidatePath(`/c/${universeSlug}`);
    redirect(
      `/admin/universes/${universeId}/highlights?level=ok&msg=${encodeURIComponent(
        `${result.message}${failChecks.length > 0 ? ` Falhas criticas: ${failChecks.length}.` : ''}`,
      )}`,
    );
  }
  const failDetails = failChecks.length > 0 ? ` | ${failChecks.map((item) => item.label).join(', ')}` : '';
  redirect(`/admin/universes/${universeId}/highlights?level=error&msg=${encodeURIComponent(`${result.message}${failDetails}`)}`);
}

export default async function AdminUniverseHighlightsPage({ params, searchParams }: HighlightsPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const db = getAdminDb();
  const universe = await getUniverseById(id);
  if (!db || !universe) notFound();

  const [highlights, evidencesQuery, eventsQuery, questionsQuery] = await Promise.all([
    getUniverseHighlights(id),
    db.from('evidences').select('id, title, summary, node_id, created_at').eq('universe_id', id).order('created_at', { ascending: false }).limit(80),
    db.from('events').select('id, title, day, kind').eq('universe_id', id).order('day', { ascending: false }).limit(80),
    db.from('node_questions').select('question').eq('universe_id', id).order('pin_rank', { ascending: true }).limit(40),
  ]);

  const selectedEvidence = new Set(highlights?.evidenceIds ?? []);
  const selectedEvents = new Set(highlights?.eventIds ?? []);
  const selectedQuestions = (highlights?.questionPrompts ?? []).join('\n');
  const message = String(sp.msg ?? '').trim();
  const level = sp.level === 'ok' ? 'ok' : 'error';

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Highlights' },
          ]}
          ariaLabel='Trilha highlights de vitrine'
        />
        <SectionHeader
          title={`Kit de Vitrine: ${universe.title}`}
          description='Configure destaques do Hub publico: evidencias, perguntas e marcos da linha.'
          tag='Showcase'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${id}`}>
            Voltar ao universo
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/checklist`}>
            Abrir checklist
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
        <SectionHeader title='Auto-selecao e publicacao' description='Fluxo seguro para publicar como vitrine com gate de checklist.' />
        <div className='toolbar-row'>
          <form action={autoPickFormAction}>
            <input type='hidden' name='universe_id' value={id} />
            <button className='ui-button' type='submit'>
              Auto-selecionar destaques
            </button>
          </form>
          <form action={publishShowcaseFormAction} className='toolbar-row'>
            <input type='hidden' name='universe_id' value={id} />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type='checkbox' name='force' />
              Force (admin)
            </label>
            <button className='ui-button' type='submit'>
              Publicar como vitrine
            </button>
          </form>
        </div>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Editor de destaques' description='Selecione ate 6 evidencias, 3 perguntas em destaque e 3 eventos.' />
        <form action={saveHighlightsFormAction} className='stack'>
          <input type='hidden' name='universe_id' value={id} />

          <section className='stack'>
            <h3 style={{ margin: 0 }}>Evidencias destacadas (max 6)</h3>
            <div className='stack'>
              {(evidencesQuery.data ?? []).map((item) => (
                <label key={item.id} className='core-node'>
                  <input
                    type='checkbox'
                    name='evidence_ids'
                    value={item.id}
                    defaultChecked={selectedEvidence.has(item.id)}
                  />{' '}
                  <strong>{item.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {item.summary}
                  </p>
                </label>
              ))}
              {(evidencesQuery.data ?? []).length === 0 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Sem evidencias disponiveis para este universo.
                </p>
              ) : null}
            </div>
          </section>

          <section className='stack'>
            <h3 style={{ margin: 0 }}>Perguntas destacadas (3-6)</h3>
            <textarea
              name='question_prompts'
              defaultValue={selectedQuestions || (questionsQuery.data ?? []).map((q) => q.question).slice(0, 3).join('\n')}
              rows={6}
              style={{ width: '100%' }}
            />
          </section>

          <section className='stack'>
            <h3 style={{ margin: 0 }}>Linha destacada (max 3 eventos)</h3>
            <div className='stack'>
              {(eventsQuery.data ?? []).map((item) => (
                <label key={item.id} className='core-node'>
                  <input type='checkbox' name='event_ids' value={item.id} defaultChecked={selectedEvents.has(item.id)} />{' '}
                  <strong>{item.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>
                    {item.day ?? 's/data'} | {item.kind ?? 'event'}
                  </p>
                </label>
              ))}
              {(eventsQuery.data ?? []).length === 0 ? (
                <p className='muted' style={{ margin: 0 }}>
                  Sem eventos disponiveis para este universo.
                </p>
              ) : null}
            </div>
          </section>

          <div className='toolbar-row'>
            <button className='ui-button' type='submit'>
              Salvar
            </button>
            <Carimbo>{`evidencias:${highlights?.evidenceIds.length ?? 0}`}</Carimbo>
            <Carimbo>{`perguntas:${highlights?.questionPrompts.length ?? 0}`}</Carimbo>
            <Carimbo>{`eventos:${highlights?.eventIds.length ?? 0}`}</Carimbo>
          </div>
        </form>
      </Card>
    </main>
  );
}
