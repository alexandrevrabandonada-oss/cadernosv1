import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, getUniverseById, hasAdminWriteAccess } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

type AdminUniverseTrailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trail?: string; rl?: string }>;
};

async function saveStepTaskAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;

  const universeId = String(formData.get('universe_id') ?? '').trim();
  const trailId = String(formData.get('trail_id') ?? '').trim();
  const stepId = String(formData.get('step_id') ?? '').trim();
  const requiredRaw = String(formData.get('required_evidence_ids') ?? '').trim();
  const guidedQuestion = String(formData.get('guided_question') ?? '').trim();
  const guidedNodeId = String(formData.get('guided_node_id') ?? '').trim();
  const requiresQuestion = String(formData.get('requires_question') ?? '') === 'on';
  if (!universeId || !trailId || !stepId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/trilhas/step/save`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/trilhas?trail=${trailId}&rl=${rl.retryAfterSec}`);
  }

  const requiredEvidenceIds = requiredRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  await db
    .from('trail_steps')
    .update({
      required_evidence_ids: requiredEvidenceIds.length > 0 ? requiredEvidenceIds : null,
      guided_question: guidedQuestion || null,
      guided_node_id: guidedNodeId || null,
      requires_question: requiresQuestion,
    })
    .eq('id', stepId)
    .eq('trail_id', trailId);

  revalidatePath(`/admin/universes/${universeId}/trilhas`);
}

export default async function AdminUniverseTrailsPage({ params, searchParams }: AdminUniverseTrailsPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const db = getAdminDb();
  const canWrite = await hasAdminWriteAccess();
  const configured = Boolean(db);
  const retrySec = Number(sp.rl ?? 0);

  if (!universe || !db) notFound();

  const [{ data: trailsRaw }, { data: nodesRaw }, { data: evidencesRaw }] = await Promise.all([
    db.from('trails').select('id, slug, title, summary').eq('universe_id', id).order('created_at', { ascending: true }),
    db.from('nodes').select('id, title').eq('universe_id', id).order('title', { ascending: true }),
    db.from('evidences').select('id, title').eq('universe_id', id).order('created_at', { ascending: false }).limit(200),
  ]);

  const trails = trailsRaw ?? [];
  const selectedTrail = trails.find((item) => item.id === sp.trail || item.slug === sp.trail) ?? trails[0] ?? null;
  const nodes = nodesRaw ?? [];
  const evidences = evidencesRaw ?? [];
  const { data: stepsRaw } = selectedTrail
    ? await db
        .from('trail_steps')
        .select(
          'id, step_order, title, instruction, required_evidence_ids, guided_question, guided_node_id, requires_question',
        )
        .eq('trail_id', selectedTrail.id)
        .order('step_order', { ascending: true })
    : { data: [] as Array<Record<string, unknown>> };

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${id}`, label: universe.slug },
            { label: 'Trilhas' },
          ]}
          ariaLabel='Trilha admin trilhas'
        />
        <SectionHeader
          title={`Trilhas educativas: ${universe.title}`}
          description='Edite tarefas dos passos: evidencias obrigatorias, pergunta guiada e requisito de pergunta.'
          tag='Tutoria 2.0'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${id}`}>
            Voltar ao universo
          </Link>
          <Link className='ui-button' href={`/admin/universes/${id}/checklist`}>
            Voltar ao checklist
          </Link>
        </div>
      </Card>

      {retrySec > 0 ? (
        <Card>
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        </Card>
      ) : null}

      <Card className='stack'>
        <SectionHeader title='Selecionar trilha' />
        <div className='toolbar-row'>
          {trails.map((trail) => (
            <Link
              key={trail.id}
              className='ui-button'
              data-variant={selectedTrail?.id === trail.id ? 'primary' : 'ghost'}
              href={`/admin/universes/${id}/trilhas?trail=${trail.id}`}
            >
              {trail.title}
            </Link>
          ))}
        </div>
      </Card>

      {selectedTrail ? (
        <Card className='stack'>
          <SectionHeader
            title={`Editar passos: ${selectedTrail.title}`}
            description='Campos opcionais; trilhas antigas continuam validas sem tarefas.'
          />
          <div className='stack'>
            {(stepsRaw ?? []).map((step) => (
              <form key={String(step.id)} action={saveStepTaskAction} className='core-node stack'>
                <input type='hidden' name='universe_id' value={id} />
                <input type='hidden' name='trail_id' value={selectedTrail.id} />
                <input type='hidden' name='step_id' value={String(step.id)} />
                <strong>
                  {String(step.step_order)}. {String(step.title)}
                </strong>
                <p className='muted' style={{ margin: 0 }}>
                  {String(step.instruction ?? '')}
                </p>
                <label>
                  <span>required_evidence_ids (csv, max 3)</span>
                  <input
                    name='required_evidence_ids'
                    defaultValue={((step.required_evidence_ids as string[] | null) ?? []).join(',')}
                    placeholder='uuid1, uuid2'
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  <span>guided_question</span>
                  <textarea
                    name='guided_question'
                    defaultValue={(step.guided_question as string | null) ?? ''}
                    rows={2}
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  <span>guided_node_id</span>
                  <select name='guided_node_id' defaultValue={(step.guided_node_id as string | null) ?? ''} style={{ width: '100%', minHeight: 40 }}>
                    <option value=''>Sem no guiado</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <input type='checkbox' name='requires_question' defaultChecked={Boolean(step.requires_question)} />
                  requires_question
                </label>
                <button className='ui-button' type='submit' disabled={!configured || !canWrite}>
                  Salvar tarefas do passo
                </button>
                <p className='muted' style={{ margin: 0 }}>
                  Evidencias disponiveis: {evidences.slice(0, 6).map((ev) => ev.id).join(', ')}
                  {evidences.length > 6 ? ' ...' : ''}
                </p>
              </form>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className='muted' style={{ margin: 0 }}>
            Nenhuma trilha encontrada para este universo.
          </p>
        </Card>
      )}
    </main>
  );
}
