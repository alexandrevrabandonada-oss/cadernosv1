import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { createEditorialProgram, listEditorialPrograms } from '@/lib/editorial/program';
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

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { label: 'Programa editorial' },
          ]}
          ariaLabel='Trilha programa editorial'
        />
        <SectionHeader
          title='Programa editorial multiuniverso'
          description='Orquestre varios universos em paralelo sem duplicar bootstrap, ingest, review e publish.'
          tag='Operacao'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes'>
            Universos
          </Link>
        </div>
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
      </Card>

      <Card className='stack'>
        <SectionHeader
          title='Novo programa'
          description='Crie um board editorial e depois abra um lote de 3 universos usando templates ja existentes.'
        />
        <form action={createProgramAction} className='stack'>
          <label>
            <span>Titulo</span>
            <input name='title' required style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Slug</span>
            <input name='slug' placeholder='programa-editorial-marco' style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Resumo</span>
            <textarea name='summary' rows={3} style={{ width: '100%' }} />
          </label>
          <button className='ui-button' type='submit'>
            Criar programa
          </button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Programas existentes' description='Cada programa agrega universos em lanes operacionais simples.' />
        <div className='stack'>
          {programs.map((program) => (
            <article key={program.id} className='core-node'>
              <strong>{program.title}</strong>
              <p className='muted' style={{ margin: 0 }}>
                {program.slug}
              </p>
              {program.summary ? (
                <p className='muted' style={{ margin: 0 }}>
                  {program.summary}
                </p>
              ) : null}
              <div className='toolbar-row'>
                <Link className='ui-button' href={`/admin/programa-editorial/${program.slug}`}>
                  Abrir board
                </Link>
              </div>
            </article>
          ))}
          {programs.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum programa editorial criado ainda.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}



