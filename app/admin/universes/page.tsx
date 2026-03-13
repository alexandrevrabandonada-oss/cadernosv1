import { spawnSync } from 'node:child_process';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AdminNotice } from '@/components/admin/AdminNotice';
import { getAdminDb, hasAdminWriteAccess, listUniverses, slugify } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { EDITORIAL_PROGRAM_2026 } from '@/lib/editorial/programBatch';
import { getProgramBoard, laneLabel, type EditorialLane } from '@/lib/editorial/program';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { listUniverseBootstrapTemplates } from '@/lib/universe/bootstrapTemplates';
import { listRecentInboxBatches } from '@/lib/universe/inbox';

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

function inferTemplateLabel(note: string | null | undefined) {
  if (!note) return null;
  if (note.includes('issue_investigation')) return 'Investigacao de tema';
  if (note.includes('territorial_memory')) return 'Memoria territorial';
  if (note.includes('campaign_watch')) return 'Monitoramento continuo';
  if (note.includes('blank_minimal')) return 'Em branco';
  return null;
}

function statusFromLane(input: { lane: string | null; published: boolean | null }) {
  if (input.published) return 'publicado';
  if (!input.lane) return 'manual';
  return laneLabel(input.lane as EditorialLane).toLowerCase();
}

export default async function AdminUniversesPage({ searchParams }: AdminUniversesPageProps) {
  const session = await requireEditorOrAdmin();
  const sp = await searchParams;
  const [universes, canWrite, recentInboxBatches, board] = await Promise.all([
    listUniverses(),
    hasAdminWriteAccess(),
    listRecentInboxBatches(3),
    getProgramBoard(EDITORIAL_PROGRAM_2026.slug),
  ]);
  const configured = Boolean(getAdminDb());
  const retrySec = Number(sp.rl ?? 0);
  const demoStatus = String(sp.demo ?? '');
  const templates = listUniverseBootstrapTemplates();
  const boardCards = board?.columns.flatMap((column) => column.items) ?? [];
  const boardByUniverseId = new Map(boardCards.map((card) => [card.universe.id, card]));
  const latestBatch = recentInboxBatches[0] ?? null;

  return (
    <main className='stack'>
      <Card className='stack'>
        <Breadcrumb
          items={[
            { href: '/', label: 'Home' },
            { href: '/admin', label: 'Admin' },
            { label: 'Criar universo' },
          ]}
          ariaLabel='Trilha de criacao editorial'
        />
        <SectionHeader
          title='Criar universo'
          description='Escolha como este recorte nasce: por lote documental, por template ou manualmente.'
          tag='Cockpit editorial'
        />
        <div className='toolbar-row'>
          <Badge variant='ok'>Inbox documental ativa</Badge>
          <Badge>Modelos editoriais prontos</Badge>
          <Badge>Board editorial conectado</Badge>
          <Badge>{`role:${session.role}`}</Badge>
        </div>
        {!canWrite ? (
          <p className='muted' style={{ margin: 0 }}>
            Seu perfil esta em modo somente leitura nesta area.
          </p>
        ) : null}
        {retrySec > 0 ? (
          <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
            Muitas acoes em pouco tempo. Tente novamente em {retrySec}s.
          </p>
        ) : null}
      </Card>

      {!configured && session.role === 'admin' ? (
        <AdminNotice
          title='Escrita admin indisponivel no momento'
          description='Configure SUPABASE_SERVICE_ROLE_KEY para habilitar criacao, ingest e operacoes persistentes do cockpit editorial.'
          docsHref='/admin/status'
          docsLabel='Ver painel operacional'
        />
      ) : null}

      <Card className='stack'>
        <SectionHeader title='3 portas principais' description='Entre pelo pipeline certo em vez de preencher um CMS cru.' />
        <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <article className='core-node stack'>
            <Badge variant='ok'>Principal</Badge>
            <strong>Entrar documentos</strong>
            <p className='muted' style={{ margin: 0 }}>
              Arraste um lote documental, deixe a IA sugerir o recorte e crie o universo ja conectado ao board editorial.
            </p>
            <div className='toolbar-row'>
              <Link className='ui-button' href='/admin/universes/inbox'>Abrir inbox documental</Link>
            </div>
          </article>

          <article className='core-node stack'>
            <Badge>Modelos editoriais</Badge>
            <strong>Criar por template</strong>
            <p className='muted' style={{ margin: 0 }}>
              Comece com uma estrutura editorial pronta para investigacao, memoria territorial, monitoramento ou recorte minimo.
            </p>
            <div className='toolbar-row'>
              <Link className='ui-button' href='/admin/universes/new'>Abrir wizard</Link>
            </div>
          </article>

          <article className='core-node stack'>
            <Badge variant='warning'>Modo avancado</Badge>
            <strong>Modo avancado/manual</strong>
            <p className='muted' style={{ margin: 0 }}>
              Use este modo quando voce ja sabe exatamente o universo que quer abrir e nao precisa passar por lote nem template.
            </p>
            <div className='toolbar-row'>
              <a className='ui-button' href='#modo-avancado'>Mostrar formulario</a>
            </div>
          </article>
        </div>
      </Card>

      <div className='layout-shell' style={{ gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(320px, 1fr)' }}>
        <Card className='stack'>
          <SectionHeader title='Inbox documental' description='A porta principal para lote documental e abertura assistida de universo.' />
          {latestBatch ? (
            <article className='core-node stack'>
              <strong>Ultimo lote analisado</strong>
              <p className='muted' style={{ margin: 0 }}>
                {latestBatch.analysis.title || latestBatch.title || 'Lote sem titulo sugerido'}
              </p>
              <div className='toolbar-row'>
                <Badge>{`status:${latestBatch.status}`}</Badge>
                <Badge>{`template:${latestBatch.analysis.templateId}`}</Badge>
                <Badge>{`confianca:${latestBatch.analysis.confidence}`}</Badge>
              </div>
              {latestBatch.analysis.warnings[0] ? (
                <p className='muted' style={{ margin: 0, color: 'var(--alert-0)' }}>{latestBatch.analysis.warnings[0]}</p>
              ) : null}
              <div className='toolbar-row'>
                <Link className='ui-button' href={`/admin/universes/inbox?batch=${latestBatch.id}`}>Retomar Inbox</Link>
                <Link className='ui-button' data-variant='ghost' href='/admin/universes/inbox'>Abrir Inbox</Link>
              </div>
            </article>
          ) : (
            <article className='core-node stack'>
              <strong>Nenhum lote recente</strong>
              <p className='muted' style={{ margin: 0 }}>
                Quando voce analisar um lote de PDFs, o resumo operacional aparece aqui para retomar o fluxo sem voltar ao zero.
              </p>
              <div className='toolbar-row'>
                <Link className='ui-button' href='/admin/universes/inbox'>Abrir inbox documental</Link>
              </div>
            </article>
          )}
        </Card>

        <Card className='stack'>
          <SectionHeader title='Modelos editoriais' description='Modelos prontos para entrar rapido em operacao.' />
          <div className='layout-shell' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {templates.map((template) => (
              <article key={template.id} className='core-node'>
                <strong>{template.label}</strong>
                <p className='muted' style={{ margin: 0 }}>{template.description}</p>
              </article>
            ))}
          </div>
          <div className='toolbar-row'>
            <Link className='ui-button' href='/admin/universes/new'>Criar por template</Link>
          </div>
        </Card>
      </div>

      <Card className='stack'>
        <SectionHeader title='Atalhos de operacao' description='Movimentos rapidos para seguir no pipeline editorial principal.' />
        <div className='toolbar-row'>
          <Link className='ui-button' href='/admin/universes/featured'>Gerir vitrine editorial</Link>
          <Link className='ui-button' href='/admin/programa-editorial'>Programa editorial</Link>
          <Link className='ui-button' href='/admin/universes/inbox'>Inbox documental</Link>
          <Link className='ui-button' href={`/admin/programa-editorial/${EDITORIAL_PROGRAM_2026.slug}`}>Board multiuniverso</Link>
        </div>
      </Card>

      <Card className='stack' id='modo-avancado'>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Modo avancado/manual</summary>
          <div className='stack' style={{ marginTop: 16 }}>
            <SectionHeader
              title='Criacao manual avancada'
              description='Use este modo quando voce ja sabe exatamente o universo que quer abrir.'
            />
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
              <div className='toolbar-row'>
                <button className='ui-button' type='submit' disabled={!configured || !canWrite}>Criar universo manualmente</button>
              </div>
            </form>

            <hr style={{ width: '100%', borderColor: 'var(--line-1)' }} />

            <SectionHeader
              title='Atalho demo'
              description='Mantem o seed operacional de Poluicao VR para validacao rapida do ambiente.'
            />
            {demoStatus === 'ok' ? <p className='muted' role='status' style={{ margin: 0 }}>Universo demo criado/atualizado com sucesso.</p> : null}
            {demoStatus === 'error' ? (
              <p className='muted' role='alert' style={{ margin: 0, color: 'var(--alert-0)' }}>
                Falha ao executar seed demo. Rode `npm run demo:seed` no terminal para diagnostico.
              </p>
            ) : null}
            <form action={seedDemoUniverseAction}>
              <button className='ui-button' type='submit' disabled={!configured || !canWrite}>Criar/Atualizar DEMO Poluicao VR</button>
            </form>
          </div>
        </details>
      </Card>

      <Card className='stack'>
        <SectionHeader title='Universos em operacao' description='Painel editorial dos recortes ja criados.' />
        {universes.length === 0 ? (
          <article className='core-node stack'>
            <strong>Nenhum universo criado ainda</strong>
            <p className='muted' style={{ margin: 0 }}>
              Comece entrando um lote documental ou abra um template pronto para tirar o primeiro universo do papel.
            </p>
            <div className='toolbar-row'>
              <Link className='ui-button' href='/admin/universes/inbox'>Entrar documentos</Link>
              <Link className='ui-button' data-variant='ghost' href='/admin/universes/new'>Criar por template</Link>
            </div>
          </article>
        ) : (
          <div className='stack'>
            {universes.map((universe) => {
              const boardCard = boardByUniverseId.get(universe.id);
              const status = statusFromLane({ lane: boardCard?.item.lane ?? null, published: universe.published });
              const templateLabel = boardCard?.templateLabel ?? inferTemplateLabel(boardCard?.item.note) ?? 'manual ou nao identificado';
              return (
                <article key={universe.id} className='core-node stack'>
                  <div className='toolbar-row' style={{ justifyContent: 'space-between' }}>
                    <div className='stack' style={{ gap: 4 }}>
                      <strong>{universe.title}</strong>
                      <p className='muted' style={{ margin: 0 }}>{universe.slug}</p>
                    </div>
                    <div className='toolbar-row'>
                      <Badge>{`status:${status}`}</Badge>
                      <Badge>{`template:${templateLabel}`}</Badge>
                      {universe.is_featured ? <Badge variant='ok'>featured</Badge> : null}
                      {universe.focus_override ? <Badge variant='warning'>foco editorial</Badge> : null}
                    </div>
                  </div>
                  <p className='muted' style={{ margin: 0 }}>{universe.summary}</p>
                  <div className='toolbar-row'>
                    <Link className='ui-button' href={`/c/${universe.slug}`}>Abrir hub</Link>
                    <Link className='ui-button' href={boardCard ? `/admin/programa-editorial/${EDITORIAL_PROGRAM_2026.slug}` : `/admin/universes/${universe.id}/checklist`}>
                      {boardCard ? 'Abrir board e checklist' : 'Abrir checklist'}
                    </Link>
                    <Link className='ui-button' href={`/admin/universes/${universe.id}/checklist`}>Checklist</Link>
                    <Link className='ui-button' href='/admin/universes/featured'>Vitrine editorial</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </main>
  );
}




