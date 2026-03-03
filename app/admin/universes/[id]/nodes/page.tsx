import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAdminDb, getUniverseById, listNodes, parseTags, slugify } from '@/lib/admin/db';

type AdminUniverseNodesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function createNodeAction(formData: FormData) {
  'use server';
  const db = getAdminDb();
  if (!db) return;

  const universeId = String(formData.get('universe_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'concept').trim();
  const tagsRaw = String(formData.get('tags') ?? '').trim();

  if (!universeId || !title) return;
  const slug = slugify(slugRaw || title);
  if (!slug) return;

  await db.from('nodes').insert({
    universe_id: universeId,
    title,
    slug,
    kind,
    summary: summary || 'Resumo inicial do no.',
    tags: parseTags(tagsRaw),
  });

  revalidatePath(`/admin/universes/${universeId}/nodes`);
}

async function updateNodeAction(formData: FormData) {
  'use server';
  const db = getAdminDb();
  if (!db) return;

  const nodeId = String(formData.get('node_id') ?? '').trim();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const summary = String(formData.get('summary') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'concept').trim();
  const tagsRaw = String(formData.get('tags') ?? '').trim();

  if (!nodeId || !universeId || !title) return;
  const slug = slugify(slugRaw || title);
  if (!slug) return;

  await db
    .from('nodes')
    .update({
      title,
      slug,
      kind,
      summary: summary || 'Resumo inicial do no.',
      tags: parseTags(tagsRaw),
    })
    .eq('id', nodeId)
    .eq('universe_id', universeId);

  revalidatePath(`/admin/universes/${universeId}/nodes`);
}

async function deleteNodeAction(formData: FormData) {
  'use server';
  const db = getAdminDb();
  if (!db) return;

  const nodeId = String(formData.get('node_id') ?? '').trim();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  if (!nodeId || !universeId) return;

  await db.from('nodes').delete().eq('id', nodeId).eq('universe_id', universeId);
  revalidatePath(`/admin/universes/${universeId}/nodes`);
}

export default async function AdminUniverseNodesPage({ params }: AdminUniverseNodesPageProps) {
  const { id } = await params;
  const universe = await getUniverseById(id);
  const configured = Boolean(getAdminDb());

  if (!universe) {
    notFound();
  }

  const nodes = await listNodes(id);
  const kindOptions = ['concept', 'event', 'person', 'evidence', 'question'];

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${universe.id}`, label: universe.slug },
            { label: 'Nodes' },
          ]}
          ariaLabel='Trilha admin nodes'
        />
        <SectionHeader
          title={`Nodes de ${universe.title}`}
          description='CRUD simples de nos por universo.'
          tag='Nodes'
        />
      </Card>

      <Card className='stack'>
        <SectionHeader title='Criar no' />
        <form action={createNodeAction} className='stack'>
          <input type='hidden' name='universe_id' value={universe.id} />
          <label>
            <span>Titulo</span>
            <input name='title' required style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Slug (opcional)</span>
            <input name='slug' style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Tipo</span>
            <select name='kind' defaultValue='concept' style={{ width: '100%', minHeight: 40 }}>
              {kindOptions.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Resumo</span>
            <textarea name='summary' rows={3} style={{ width: '100%' }} />
          </label>
          <label>
            <span>Tags (separadas por virgula)</span>
            <input name='tags' placeholder='mvp, base, contexto' style={{ width: '100%', minHeight: 40 }} />
          </label>
          <button className='ui-button' type='submit' disabled={!configured}>
            Criar no
          </button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Nos cadastrados' />
        <div className='stack'>
          {nodes.map((node) => (
            <form key={node.id} action={updateNodeAction} className='core-node stack'>
              <input type='hidden' name='node_id' value={node.id} />
              <input type='hidden' name='universe_id' value={universe.id} />
              <label>
                <span>Titulo</span>
                <input name='title' defaultValue={node.title} required style={{ width: '100%', minHeight: 40 }} />
              </label>
              <label>
                <span>Slug</span>
                <input name='slug' defaultValue={node.slug} required style={{ width: '100%', minHeight: 40 }} />
              </label>
              <label>
                <span>Tipo</span>
                <select name='kind' defaultValue={node.kind} style={{ width: '100%', minHeight: 40 }}>
                  {kindOptions.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Resumo</span>
                <textarea name='summary' defaultValue={node.summary} rows={2} style={{ width: '100%' }} />
              </label>
              <label>
                <span>Tags</span>
                <input
                  name='tags'
                  defaultValue={(node.tags ?? []).join(', ')}
                  style={{ width: '100%', minHeight: 40 }}
                />
              </label>
              <div className='toolbar-row'>
                <button className='ui-button' type='submit' disabled={!configured}>
                  Salvar no
                </button>
                <button
                  className='ui-button'
                  type='submit'
                  formAction={deleteNodeAction}
                  disabled={!configured}
                  data-variant='ghost'
                >
                  Excluir
                </button>
              </div>
            </form>
          ))}
          {nodes.length === 0 ? (
            <p className='muted' style={{ margin: 0 }}>
              Nenhum no cadastrado para este universo.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
