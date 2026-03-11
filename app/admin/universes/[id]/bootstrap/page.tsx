import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getUniverseById, listUniverses } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { bootstrapUniverseFromTemplate, cloneUniverseStructure, normalizeCloneOptions } from '@/lib/universe/bootstrap';
import { listUniverseBootstrapTemplates, type UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';

type BootstrapPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; applied?: string; cloned?: string; rl?: string }>;
};

async function applyTemplateAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const universeSlug = String(formData.get('universe_slug') ?? '').trim();
  const templateId = String(formData.get('template_id') ?? '').trim();
  if (!universeId || !universeSlug || !templateId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/bootstrap/template`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/bootstrap?rl=${rl.retryAfterSec}`);
  }

  await bootstrapUniverseFromTemplate({
    universeId,
    universeSlug,
    templateId: templateId as UniverseBootstrapTemplateId,
    userId: session.userId,
  });
  redirect(`/admin/universes/${universeId}/bootstrap?applied=1`);
}

async function cloneStructureAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const universeId = String(formData.get('universe_id') ?? '').trim();
  const sourceUniverseId = String(formData.get('source_universe_id') ?? '').trim();
  if (!universeId || !sourceUniverseId) return;

  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/bootstrap/clone`);
  if (!rl.ok) {
    redirect(`/admin/universes/${universeId}/bootstrap?rl=${rl.retryAfterSec}`);
  }

  await cloneUniverseStructure({
    sourceUniverseId,
    targetUniverseId: universeId,
    userId: session.userId,
    options: normalizeCloneOptions({
      nodes: formData.get('nodes') === 'on',
      glossary: formData.get('glossary') === 'on',
      trails: formData.get('trails') === 'on',
      nodeQuestions: formData.get('node_questions') === 'on',
      collectiveTemplates: formData.get('collective_templates') === 'on',
      homeEditorialDefaults: formData.get('home_editorial_defaults') === 'on',
    }),
  });

  redirect(`/admin/universes/${universeId}/bootstrap?cloned=1`);
}

export default async function UniverseBootstrapPage({ params, searchParams }: BootstrapPageProps) {
  await requireEditorOrAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const universe = await getUniverseById(id);
  const templates = listUniverseBootstrapTemplates();
  const universes = await listUniverses();
  if (!universe) notFound();

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { href: `/admin/universes/${universe.id}`, label: universe.slug },
            { label: 'Bootstrap' },
          ]}
          ariaLabel='Trilha bootstrap do universo'
        />
        <SectionHeader
          title={`Bootstrap / Clone: ${universe.title}`}
          description='Aplique um template operacional ou clone parcial da estrutura de outro universo sem copiar conteudo sensivel.'
          tag='Bootstrap'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href={`/admin/universes/${universe.id}`}>
            Voltar ao universo
          </Link>
          <Link className='ui-button' href={`/c/${universe.slug}`}>
            Abrir hub
          </Link>
          <Link className='ui-button' href={`/admin/universes/${universe.id}/checklist`}>
            Checklist inicial
          </Link>
        </div>
        {sp.created === '1' ? <p className='muted' role='status' style={{ margin: 0 }}>Universo criado. Aplique ou revise o bootstrap abaixo.</p> : null}
        {sp.applied === '1' ? <p className='muted' role='status' style={{ margin: 0 }}>Template aplicado com sucesso.</p> : null}
        {sp.cloned === '1' ? <p className='muted' role='status' style={{ margin: 0 }}>Clone estrutural concluido.</p> : null}
        {sp.rl ? <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>Muitas acoes em pouco tempo. Tente novamente em {sp.rl}s.</p> : null}
      </Card>

      <Card className='stack'>
        <SectionHeader title='Aplicar template' description='Boa opcao para um universo novo ou para preencher a estrutura minima do Hub.' />
        <form action={applyTemplateAction} className='stack'>
          <input type='hidden' name='universe_id' value={universe.id} />
          <input type='hidden' name='universe_slug' value={universe.slug} />
          <label>
            <span>Template</span>
            <select name='template_id' defaultValue='issue_investigation' style={{ width: '100%', minHeight: 40 }}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>
          </label>
          <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {templates.map((template) => (
              <article key={template.id} className='core-node'>
                <strong>{template.label}</strong>
                <p className='muted' style={{ margin: 0 }}>{template.summaryHint}</p>
                <p className='muted' style={{ margin: 0 }}>
                  {template.seedNodes.length} nos | {template.seedGlossary.length} termos | {template.seedTrails.length} trilhas
                </p>
              </article>
            ))}
          </div>
          <button className='ui-button' type='submit'>Aplicar template</button>
        </form>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Clonar estrutura de outro universo' description='Copia apenas estrutura editorial: nos, glossario, trilhas, perguntas, templates de coletivos e defaults featured/focus se voce marcar.' />
        <form action={cloneStructureAction} className='stack'>
          <input type='hidden' name='universe_id' value={universe.id} />
          <label>
            <span>Universo de origem</span>
            <select name='source_universe_id' defaultValue='' style={{ width: '100%', minHeight: 40 }}>
              <option value=''>Selecione um universo</option>
              {universes.filter((item) => item.id !== universe.id).map((item) => (
                <option key={item.id} value={item.id}>{item.title} ({item.slug})</option>
              ))}
            </select>
          </label>
          <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label><input type='checkbox' name='nodes' defaultChecked /> Nos core</label>
            <label><input type='checkbox' name='glossary' defaultChecked /> Glossario base</label>
            <label><input type='checkbox' name='trails' defaultChecked /> Trilhas base</label>
            <label><input type='checkbox' name='node_questions' defaultChecked /> Perguntas iniciais</label>
            <label><input type='checkbox' name='collective_templates' defaultChecked /> Templates de coletivos</label>
            <label><input type='checkbox' name='home_editorial_defaults' /> Featured / focus defaults</label>
          </div>
          <p className='muted' style={{ margin: 0 }}>
            Nunca sao clonados: evidences, documents, events por padrao, exports, analytics, user_notes, shared_notebooks reais e study_sessions.
          </p>
          <button className='ui-button' type='submit'>Clonar estrutura</button>
        </form>
      </Card>
    </main>
  );
}

