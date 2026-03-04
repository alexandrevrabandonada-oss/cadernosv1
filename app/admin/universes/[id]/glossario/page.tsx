import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, getUniverseById, hasAdminWriteAccess, parseTags, slugify } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

type AdminGlossarioPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rl?: string }>;
};

function parseLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

async function createTermAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const term = String(formData.get('term') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const shortDef = String(formData.get('short_def') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const tagsRaw = String(formData.get('tags') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const evidenceIdsRaw = formData.getAll('evidence_ids').map((item) => String(item).trim()).filter(Boolean);
  const promptsRaw = String(formData.get('question_prompts') ?? '').trim();
  if (!universeId || !term) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/glossario/create`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/glossario?rl=${rl.retryAfterSec}`);

  const slug = slugify(slugRaw || term);
  if (!slug) return;

  await db.from('glossary_terms').insert({
    universe_id: universeId,
    term,
    slug,
    short_def: shortDef || null,
    body: body || null,
    tags: parseTags(tagsRaw),
    node_id: nodeId || null,
    evidence_ids: evidenceIdsRaw,
    question_prompts: parseLines(promptsRaw),
    created_by: session.userId,
  });
  revalidatePath(`/admin/universes/${universeId}/glossario`);
}

async function updateTermAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const termId = String(formData.get('term_id') ?? '').trim();
  const term = String(formData.get('term') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const shortDef = String(formData.get('short_def') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const tagsRaw = String(formData.get('tags') ?? '').trim();
  const nodeId = String(formData.get('node_id') ?? '').trim();
  const evidenceIdsRaw = formData.getAll('evidence_ids').map((item) => String(item).trim()).filter(Boolean);
  const promptsRaw = String(formData.get('question_prompts') ?? '').trim();
  if (!universeId || !termId || !term) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/glossario/update`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/glossario?rl=${rl.retryAfterSec}`);

  const slug = slugify(slugRaw || term);
  if (!slug) return;
  await db
    .from('glossary_terms')
    .update({
      term,
      slug,
      short_def: shortDef || null,
      body: body || null,
      tags: parseTags(tagsRaw),
      node_id: nodeId || null,
      evidence_ids: evidenceIdsRaw,
      question_prompts: parseLines(promptsRaw),
    })
    .eq('id', termId)
    .eq('universe_id', universeId);
  revalidatePath(`/admin/universes/${universeId}/glossario`);
}

async function deleteTermAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const termId = String(formData.get('term_id') ?? '').trim();
  if (!universeId || !termId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/glossario/delete`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/glossario?rl=${rl.retryAfterSec}`);

  await db.from('glossary_terms').delete().eq('id', termId).eq('universe_id', universeId);
  revalidatePath(`/admin/universes/${universeId}/glossario`);
}

async function suggestTermsAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const db = getAdminDb();
  if (!db) return;
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!universeId) return;
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/glossario/suggest`);
  if (!rl.ok) redirect(`/admin/universes/${universeId}/glossario?rl=${rl.retryAfterSec}`);

  const [{ data: nodesRaw }, { data: docsRaw }] = await Promise.all([
    db.from('nodes').select('id, title, slug, tags, kind').eq('universe_id', universeId).order('created_at', { ascending: true }).limit(20),
    db.from('documents').select('title').eq('universe_id', universeId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(20),
  ]);

  const tags = Array.from(new Set((nodesRaw ?? []).flatMap((node) => node.tags ?? []).filter(Boolean))).slice(0, 14);
  const docTerms = Array.from(
    new Set(
      (docsRaw ?? [])
        .flatMap((doc) => doc.title.split(/\s+/))
        .map((token) => token.replace(/[^a-zA-Z0-9-]/g, '').trim())
        .filter((token) => token.length >= 5),
    ),
  ).slice(0, 10);

  const suggestions = [
    ...(nodesRaw ?? []).map((node) => ({
      term: node.title,
      slug: slugify(node.slug || node.title),
      short_def: `Entrada sugerida a partir do no "${node.title}".`,
      tags: (node.tags ?? []).slice(0, 5),
      node_id: node.id,
    })),
    ...tags.map((tag) => ({
      term: tag,
      slug: slugify(tag),
      short_def: `Tag frequente no universo: ${tag}.`,
      tags: [tag],
      node_id: null,
    })),
    ...docTerms.map((term) => ({
      term,
      slug: slugify(term),
      short_def: `Termo sugerido por metadados de documentos: ${term}.`,
      tags: [],
      node_id: null,
    })),
  ];

  for (const suggestion of suggestions) {
    if (!suggestion.slug || !suggestion.term) continue;
    await db.from('glossary_terms').upsert(
      {
        universe_id: universeId,
        term: suggestion.term,
        slug: suggestion.slug,
        short_def: suggestion.short_def,
        tags: suggestion.tags,
        node_id: suggestion.node_id,
        created_by: session.userId,
      },
      { onConflict: 'universe_id,slug', ignoreDuplicates: true },
    );
  }

  revalidatePath(`/admin/universes/${universeId}/glossario`);
}

export default async function AdminUniverseGlossarioPage({ params, searchParams }: AdminGlossarioPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const db = getAdminDb();
  const canWrite = await hasAdminWriteAccess();
  const retrySec = Number(sp.rl ?? 0);
  if (!universe || !db) notFound();

  const [{ data: termsRaw }, { data: nodesRaw }, { data: evidencesRaw }] = await Promise.all([
    db.from('glossary_terms').select('id, term, slug, short_def, body, tags, node_id, evidence_ids, question_prompts').eq('universe_id', universe.id).order('term', { ascending: true }),
    db.from('nodes').select('id, title, slug').eq('universe_id', universe.id).order('title', { ascending: true }),
    db.from('evidences').select('id, title').eq('universe_id', universe.id).limit(200),
  ]);
  const terms = termsRaw ?? [];
  const nodes = nodesRaw ?? [];
  const evidences = evidencesRaw ?? [];

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${universe.id}`, label: universe.slug },
            { label: 'Glossario' },
          ]}
          ariaLabel='Trilha admin glossario'
        />
        <SectionHeader title={`Glossario de ${universe.title}`} description='CRUD de termos e sugestoes assistidas.' tag='Glossario' />
      </Card>

      <Card className='stack'>
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
        <div className='toolbar-row'>
          <form action={suggestTermsAction}>
            <input type='hidden' name='universe_id' value={universe.id} />
            <button className='ui-button' type='submit' disabled={!canWrite}>
              Sugerir termos
            </button>
          </form>
        </div>
        <SectionHeader title='Criar termo' />
        <form action={createTermAction} className='stack'>
          <input type='hidden' name='universe_id' value={universe.id} />
          <label><span>Termo</span><input name='term' required style={{ width: '100%', minHeight: 40 }} /></label>
          <label><span>Slug (opcional)</span><input name='slug' style={{ width: '100%', minHeight: 40 }} /></label>
          <label><span>Definicao curta</span><input name='short_def' style={{ width: '100%', minHeight: 40 }} /></label>
          <label><span>Descricao</span><textarea name='body' rows={3} style={{ width: '100%' }} /></label>
          <label><span>Tags (csv)</span><input name='tags' style={{ width: '100%', minHeight: 40 }} /></label>
          <label>
            <span>No relacionado</span>
            <select name='node_id' defaultValue='' style={{ width: '100%', minHeight: 40 }}>
              <option value=''>Nenhum</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.title}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Evidencias destacadas</span>
            <select name='evidence_ids' multiple size={6} style={{ width: '100%' }}>
              {evidences.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </label>
          <label><span>Perguntas sugeridas (1 por linha)</span><textarea name='question_prompts' rows={4} style={{ width: '100%' }} /></label>
          <button className='ui-button' type='submit' disabled={!canWrite}>Criar termo</button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Termos cadastrados' />
        <div className='stack'>
          {terms.map((term) => (
            <form key={term.id} action={updateTermAction} className='core-node stack'>
              <input type='hidden' name='universe_id' value={universe.id} />
              <input type='hidden' name='term_id' value={term.id} />
              <label><span>Termo</span><input name='term' defaultValue={term.term} required style={{ width: '100%', minHeight: 40 }} /></label>
              <label><span>Slug</span><input name='slug' defaultValue={term.slug} required style={{ width: '100%', minHeight: 40 }} /></label>
              <label><span>Definicao curta</span><input name='short_def' defaultValue={term.short_def ?? ''} style={{ width: '100%', minHeight: 40 }} /></label>
              <label><span>Descricao</span><textarea name='body' rows={3} defaultValue={term.body ?? ''} style={{ width: '100%' }} /></label>
              <label><span>Tags</span><input name='tags' defaultValue={(term.tags ?? []).join(', ')} style={{ width: '100%', minHeight: 40 }} /></label>
              <label>
                <span>No relacionado</span>
                <select name='node_id' defaultValue={term.node_id ?? ''} style={{ width: '100%', minHeight: 40 }}>
                  <option value=''>Nenhum</option>
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>{node.title}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Evidencias destacadas</span>
                <select name='evidence_ids' multiple size={6} defaultValue={term.evidence_ids ?? []} style={{ width: '100%' }}>
                  {evidences.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </label>
              <label><span>Perguntas sugeridas (1 por linha)</span><textarea name='question_prompts' rows={4} defaultValue={(term.question_prompts ?? []).join('\n')} style={{ width: '100%' }} /></label>
              <div className='toolbar-row'>
                <button className='ui-button' type='submit' disabled={!canWrite}>Salvar</button>
                <button className='ui-button' type='submit' formAction={deleteTermAction} data-variant='ghost' disabled={!canWrite}>Excluir</button>
              </div>
            </form>
          ))}
          {terms.length === 0 ? <p className='muted' style={{ margin: 0 }}>Nenhum termo cadastrado.</p> : null}
        </div>
      </Card>
    </main>
  );
}
