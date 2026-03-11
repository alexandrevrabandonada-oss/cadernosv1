import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { listUniverses, slugify } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { bootstrapUniverseWorkflow, normalizeCloneOptions } from '@/lib/universe/bootstrap';
import { applyUniverseBootstrapTemplate, listUniverseBootstrapTemplates, type UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';

async function createUniverseWizardAction(formData: FormData) {
  'use server';
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, 'admin/universes/new/bootstrap');
  if (!rl.ok) {
    redirect(`/admin/universes/new?rl=${rl.retryAfterSec}`);
  }

  const title = String(formData.get('title') ?? '').trim();
  const slugInput = String(formData.get('slug') ?? '').trim();
  const summaryInput = String(formData.get('summary') ?? '').trim();
  const mode = String(formData.get('mode') ?? 'template') === 'clone' ? 'clone' : 'template';
  const templateId = String(formData.get('template_id') ?? 'issue_investigation');
  const sourceUniverseId = String(formData.get('source_universe_id') ?? '').trim() || null;
  const publishNow = formData.get('publish_now') === 'on';

  if (!title) return;
  const template = mode === 'template' ? applyUniverseBootstrapTemplate(listUniverseBootstrapTemplates().find((item) => item.id === templateId) ?? null, { title, slug: slugInput, summary: summaryInput }) : null;
  const slug = slugify(slugInput || template?.slug || title);
  if (!slug) return;

  const created = await bootstrapUniverseWorkflow({
    mode,
    universe: {
      title,
      slug,
      summary: summaryInput || template?.summary || 'Universo em preparacao.',
      publishNow,
    },
    templateId: mode === 'template' ? (templateId as UniverseBootstrapTemplateId) : null,
    sourceUniverseId,
    cloneOptions: normalizeCloneOptions({
      nodes: formData.get('nodes') === 'on',
      glossary: formData.get('glossary') === 'on',
      trails: formData.get('trails') === 'on',
      nodeQuestions: formData.get('node_questions') === 'on',
      collectiveTemplates: formData.get('collective_templates') === 'on',
      homeEditorialDefaults: formData.get('home_editorial_defaults') === 'on',
    }),
    userId: session.userId,
  });

  redirect(`/admin/universes/${created.id}/bootstrap?created=1`);
}

type AdminUniverseNewPageProps = {
  searchParams: Promise<{ rl?: string }>;
};

export default async function AdminUniverseNewPage({ searchParams }: AdminUniverseNewPageProps) {
  await requireEditorOrAdmin();
  const sp = await searchParams;
  const templates = listUniverseBootstrapTemplates();
  const universes = await listUniverses();
  const retrySec = Number(sp.rl ?? 0);
  const defaultTemplate = templates.find((item) => item.id === 'issue_investigation') ?? templates[0];
  const defaultState = applyUniverseBootstrapTemplate(defaultTemplate, { title: defaultTemplate.titleHint });

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { href: '/admin/universes', label: 'Universes' },
            { label: 'Novo universo' },
          ]}
          ariaLabel='Trilha novo universo'
        />
        <SectionHeader
          title='Wizard de bootstrap de universo'
          description='Crie um universo novo com template operacional ou clone estrutural de um universo existente.'
          tag='Bootstrap'
        />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes'>
            Voltar aos universos
          </Link>
        </div>
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
      </Card>

      <Card className='stack'>
        <form action={createUniverseWizardAction} className='stack'>
          <SectionHeader title='1. Dados basicos' description='Titulo, slug e resumo minimo para o Hub nascer coerente.' />
          <label>
            <span>Titulo</span>
            <input name='title' defaultValue={defaultState.title} required style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Slug</span>
            <input name='slug' defaultValue={defaultState.slug} required style={{ width: '100%', minHeight: 40 }} />
          </label>
          <label>
            <span>Resumo</span>
            <textarea name='summary' defaultValue={defaultState.summary} rows={4} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type='checkbox' name='publish_now' />
            Publicar imediatamente
          </label>

          <SectionHeader title='2. Modo de criacao' description='Escolha entre template operacional ou clone de estrutura existente.' />
          <label>
            <span>Modo</span>
            <select name='mode' defaultValue='template' style={{ width: '100%', minHeight: 40 }}>
              <option value='template'>Template</option>
              <option value='clone'>Clonar estrutura</option>
            </select>
          </label>
          <label>
            <span>Template</span>
            <select name='template_id' defaultValue={defaultTemplate.id} style={{ width: '100%', minHeight: 40 }}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {templates.map((template) => (
              <article key={template.id} className='core-node'>
                <strong>{template.label}</strong>
                <p className='muted' style={{ margin: 0 }}>{template.description}</p>
                <p className='muted' style={{ margin: 0 }}>
                  {template.seedNodes.length} nos | {template.seedQuestions.length} perguntas | {template.seedTrails.length} trilhas
                </p>
              </article>
            ))}
          </div>
          <label>
            <span>Clonar de universo existente</span>
            <select name='source_universe_id' defaultValue='' style={{ width: '100%', minHeight: 40 }}>
              <option value=''>Selecione apenas se o modo for clone</option>
              {universes.map((universe) => (
                <option key={universe.id} value={universe.id}>
                  {universe.title} ({universe.slug})
                </option>
              ))}
            </select>
          </label>

          <SectionHeader title='3. Escopo do clone' description='Essas opcoes so valem quando o modo for clone.' />
          <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label><input type='checkbox' name='nodes' defaultChecked /> Estrutura de nos core</label>
            <label><input type='checkbox' name='glossary' defaultChecked /> Glossario base</label>
            <label><input type='checkbox' name='trails' defaultChecked /> Trilhas base</label>
            <label><input type='checkbox' name='node_questions' defaultChecked /> Perguntas iniciais</label>
            <label><input type='checkbox' name='collective_templates' defaultChecked /> Templates de coletivos</label>
            <label><input type='checkbox' name='home_editorial_defaults' /> Defaults featured/focus</label>
          </div>

          <Card className='stack'>
            <SectionHeader title='4. Guardrails' description='O clone nunca copia evidencias, documents, events por padrao, exports, analytics, user_notes, study_sessions nem cadernos pessoais.' />
            <p className='muted' style={{ margin: 0 }}>
              O universo nasce nao publicado, com Hub minimo, Comece Aqui e checklist inicial disponiveis no admin.
            </p>
          </Card>

          <button className='ui-button' type='submit'>
            Criar universo
          </button>
        </form>
      </Card>
    </main>
  );
}

