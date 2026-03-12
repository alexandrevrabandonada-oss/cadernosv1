import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LaneHealthBadge } from '@/components/admin/LaneHealthBadge';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { createEditorialProgram, getProgramBoard, listEditorialPrograms, summarizeProgramBoard } from '@/lib/editorial/program';
import { ensureEditorialProgram2026Batch } from '@/lib/editorial/programBatch';
import { slugify } from '@/lib/admin/db';

async function createProgramAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, 'admin/programa-editorial/create');
  if (!rl.ok) {
    redirect(`/admin/programa-editorial?rl=${rl.retryAfterSec}`);
  }

  const title = String(formData.get('title') ?? '').trim();
  const slug = slugify(String(formData.get('slug') ?? '').trim() || title);
  const summary = String(formData.get('summary') ?? '').trim();
  if (!title || !slug) return;

  const program = await createEditorialProgram({
    title,
    slug,
    summary: summary || null,
    userId: session.userId,
  });

  revalidatePath('/admin/programa-editorial');
  redirect(`/admin/programa-editorial/${program.slug}`);
}

type PageProps = {
  searchParams: Promise<{ rl?: string }>;
};

export default async function EditorialProgramsIndexPage({ searchParams }: PageProps) {
  const session = await requireEditorOrAdmin();
  const sp = await searchParams;
  const retrySec = Number(sp.rl ?? 0);
  await ensureEditorialProgram2026Batch(session.userId);
  const programs = await listEditorialPrograms();
  const enriched = await Promise.all(
    programs.map(async (program) => {
      const board = await getProgramBoard(program.slug);
      const summary = board ? summarizeProgramBoard(board) : null;
      const updatedAt = board
        ? board.columns.flatMap((column) => column.items).map((card) => card.item.updatedAt).sort((a, b) => b.localeCompare(a))[0] ?? program.createdAt
        : program.createdAt;
      return { program, board, summary, updatedAt };
    }),
  );
  const leadProgram = enriched[0]?.program.slug ?? 'programa-editorial-2026';

  return (
    <main className='stack stack-editorial'>
      <Card className='stack board-hero-card'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { label: 'Programa editorial' },
          ]}
          ariaLabel='Trilha programa editorial'
        />
        <SectionHeader
          title='Central de operacao editorial'
          description='Acompanhe varios universos em paralelo, veja onde esta travado e entre no board certo sem cair em um CRUD cru.'
          tag='Operacao'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes'>Voltar aos universos</Link>
          <Link className='ui-button' href={`/admin/programa-editorial/${leadProgram}#novo-lote`}>Criar lote de universos</Link>
        </div>
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
      </Card>

      <div className='program-index-grid'>
        <Card className='stack'>
          <SectionHeader
            title='Novo programa'
            description='Abra uma frente editorial nova quando o board principal nao for suficiente para a operacao.'
          />
          <form action={createProgramAction} className='stack'>
            <label>
              <span>Titulo</span>
              <input name='title' required style={{ width: '100%' }} />
            </label>
            <label>
              <span>Slug</span>
              <input name='slug' placeholder='programa-editorial-marco' style={{ width: '100%' }} />
            </label>
            <label>
              <span>Resumo</span>
              <textarea name='summary' rows={3} style={{ width: '100%' }} />
            </label>
            <button className='ui-button' type='submit'>Criar programa</button>
          </form>
        </Card>

        <Card className='stack'>
          <SectionHeader
            title='Programas em operacao'
            description='Veja rapidamente quantos universos cada board esta segurando e onde estao os gargalos mais visiveis.'
          />
          <div className='stack'>
            {enriched.map(({ program, board, summary, updatedAt }) => (
              <article key={program.id} className='program-index-card'>
                <div className='stack' style={{ gap: '0.35rem' }}>
                  <strong>{program.title}</strong>
                  <p className='muted' style={{ margin: 0 }}>{program.summary ?? 'Sem resumo editorial ainda.'}</p>
                  <p className='muted' style={{ margin: 0 }}>{`Atualizado em ${new Date(updatedAt).toLocaleDateString('pt-BR')}`}</p>
                </div>
                <div className='program-index-metrics'>
                  <article className='core-node'>
                    <small>Universos</small>
                    <strong>{summary?.totalUniverses ?? 0}</strong>
                  </article>
                  <article className='core-node'>
                    <small>Review</small>
                    <strong>{summary?.inReview ?? 0}</strong>
                  </article>
                  <article className='core-node'>
                    <small>Done</small>
                    <strong>{summary?.done ?? 0}</strong>
                  </article>
                </div>
                {board ? (
                  <div className='toolbar-row'>
                    {Object.entries(board.totals).map(([lane, count]) => (
                      <LaneHealthBadge key={lane} lane={lane as never} count={count} highlight={summary?.bottleneckLane?.lane === lane} />
                    ))}
                  </div>
                ) : null}
                <div className='toolbar-row'>
                  <Link className='ui-button' href={`/admin/programa-editorial/${program.slug}`}>Abrir board</Link>
                  <Link className='ui-button' data-variant='ghost' href={`/admin/programa-editorial/${program.slug}#novo-lote`}>Criar lote</Link>
                </div>
              </article>
            ))}
            {enriched.length === 0 ? (
              <div className='empty-state'>
                <div className='empty-state-head'>
                  <small>Programas</small>
                  <strong>Nenhum programa editorial criado ainda</strong>
                </div>
                <p className='muted' style={{ margin: 0 }}>Crie o primeiro board para acompanhar varios universos com lanes, gargalos e acoes rapidas.</p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </main>
  );
}
