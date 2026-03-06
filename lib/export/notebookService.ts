import 'server-only';
import { randomUUID } from 'crypto';
import { getCurrentSession } from '@/lib/auth/server';
import { prepareNotebookExport, renderNotebookMarkdown, type NotebookExportItem } from '@/lib/export/notebook';
import { renderNotebookPdf } from '@/lib/export/notebookPdf';
import type { UserNotebookExportListItem } from '@/lib/export/service';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type NotebookExportFormat = 'md' | 'pdf';

function getAdminService() {
  return getSupabaseServiceRoleClient();
}

async function ensureExportsBucket() {
  const db = getAdminService();
  if (!db) return null;

  const { data: bucket } = await db.storage.getBucket('cv-exports');
  if (bucket) return db;

  await db.storage.createBucket('cv-exports', {
    public: false,
    fileSizeLimit: '20MB',
    allowedMimeTypes: ['application/pdf', 'text/markdown'],
  });
  return db;
}

function buildPath(input: { universeId: string; sourceId: string; extension: NotebookExportFormat }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `universes/${input.universeId}/notebook/${input.sourceId}/${stamp}-${randomUUID()}.${input.extension}`;
}

async function createSignedUrl(path: string) {
  const db = getAdminService();
  if (!db) return null;
  const { data } = await db.storage.from('cv-exports').createSignedUrl(path, 60 * 60 * 8);
  return data?.signedUrl ?? null;
}

async function uploadExportFile(input: { path: string; contentType: string; body: string | Buffer }) {
  const db = await ensureExportsBucket();
  if (!db) throw new Error('storage_unavailable');
  const payload = typeof input.body === 'string' ? Buffer.from(input.body, 'utf-8') : input.body;
  const { error } = await db.storage.from('cv-exports').upload(input.path, payload, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) throw new Error('storage_upload_failed');
}

export async function createNotebookExportRecord(input: {
  universeSlug: string;
  actorLabel: string;
  items: NotebookExportItem[];
  format: NotebookExportFormat;
  includeTagIndex?: boolean;
  isPublic?: boolean;
}) {
  const session = await getCurrentSession();
  if (!session) throw new Error('unauthorized');
  if (process.env.TEST_SEED === '1') {
    const fakeId = `notebook-${Date.now()}`;
    return {
      title: `Meu Caderno - ${input.universeSlug}`,
      kind: 'notebook' as const,
      assets: [
        {
          id: `${fakeId}-${input.format}`,
          format: input.format,
          path: `/mock/${fakeId}.${input.format}`,
          signedUrl: `https://example.local/${fakeId}.${input.format}`,
        },
      ],
    };
  }

  const db = getAdminService();
  if (!db) throw new Error('db_not_configured');
  const { data: universe } = await db.from('universes').select('id, slug, title').eq('slug', input.universeSlug).maybeSingle();
  if (!universe) throw new Error('universe_not_found');

  const prepared = prepareNotebookExport({ slug: input.universeSlug, items: input.items });
  if (prepared.items.length === 0) throw new Error('empty_notebook');

  const generatedAt = new Date().toISOString();
  const title = `Meu Caderno - ${universe.title}`;
  const meta = {
    universeSlug: input.universeSlug,
    itemCount: prepared.stats.includedItems,
    tags: prepared.stats.topTags.map((item) => item.tag),
    kinds: prepared.stats.kinds,
    actorLabel: input.actorLabel,
  };

  const body =
    input.format === 'pdf'
      ? await renderNotebookPdf({
          universe: universe.title,
          title,
          actorLabel: input.actorLabel,
          items: prepared.items,
          stats: prepared.stats,
          generatedAt,
          includeTagIndex: input.includeTagIndex,
        })
      : renderNotebookMarkdown({
          universe: universe.title,
          title,
          actorLabel: input.actorLabel,
          items: prepared.items,
          stats: prepared.stats,
          generatedAt,
          includeTagIndex: input.includeTagIndex,
        });

  const storagePath = buildPath({
    universeId: universe.id,
    sourceId: session.userId,
    extension: input.format,
  });

  await uploadExportFile({
    path: storagePath,
    contentType: input.format === 'pdf' ? 'application/pdf' : 'text/markdown; charset=utf-8',
    body,
  });

  const { data: row, error } = await db
    .from('exports')
    .insert({
      universe_id: universe.id,
      kind: 'notebook',
      title,
      format: input.format,
      storage_path: storagePath,
      meta,
      is_public: Boolean(input.isPublic),
      created_by: session.userId,
    })
    .select('id, format, storage_path')
    .maybeSingle();
  if (error || !row) throw new Error('insert_export_failed');

  return {
    title,
    kind: 'notebook' as const,
    assets: [{ id: row.id, format: row.format, path: row.storage_path, signedUrl: await createSignedUrl(row.storage_path) }],
  };
}

export async function buildGuestNotebookFile(input: {
  universe: string;
  actorLabel: string;
  slug: string;
  items: NotebookExportItem[];
  format: NotebookExportFormat;
  includeTagIndex?: boolean;
}) {
  const prepared = prepareNotebookExport({ slug: input.slug, items: input.items });
  if (prepared.items.length === 0) throw new Error('empty_notebook');
  const generatedAt = new Date().toISOString();
  const title = `Meu Caderno - ${input.universe}`;
  const fileBase64 =
    input.format === 'pdf'
      ? (await renderNotebookPdf({
          universe: input.universe,
          title,
          actorLabel: input.actorLabel,
          items: prepared.items,
          stats: prepared.stats,
          generatedAt,
          includeTagIndex: input.includeTagIndex,
        })).toString('base64')
      : Buffer.from(
          renderNotebookMarkdown({
            universe: input.universe,
            title,
            actorLabel: input.actorLabel,
            items: prepared.items,
            stats: prepared.stats,
            generatedAt,
            includeTagIndex: input.includeTagIndex,
          }),
          'utf-8',
        ).toString('base64');

  return {
    title,
    generatedAt,
    fileName: `${input.slug}-meu-caderno-${generatedAt.slice(0, 10)}.${input.format}`,
    mimeType: input.format === 'pdf' ? 'application/pdf' : 'text/markdown;charset=utf-8',
    fileBase64,
    stats: prepared.stats,
  };
}

export async function listOwnNotebookExports(universeSlug: string) {
  const session = await getCurrentSession();
  if (!session) return [] as UserNotebookExportListItem[];
  if (process.env.TEST_SEED === '1') {
    return [
      {
        id: `${universeSlug}-notebook-export`,
        universe_id: `mock-${universeSlug}`,
        kind: 'notebook',
        thread_id: null,
        trail_id: null,
        session_id: null,
        title: `Meu Caderno - ${universeSlug}`,
        format: 'pdf',
        storage_path: `/mock/${universeSlug}-notebook.pdf`,
        meta: { universeSlug, itemCount: 3, tags: ['demo'], kinds: ['highlight', 'note'] },
        source_type: null,
        source_id: null,
        is_public: false,
        created_by: session.userId,
        created_at: new Date().toISOString(),
        universe_title: universeSlug,
        universe_slug: universeSlug,
      },
    ];
  }

  const db = getAdminService();
  if (!db) return [] as UserNotebookExportListItem[];
  const { data } = await db
    .from('exports')
    .select('id, universe_id, kind, thread_id, trail_id, session_id, source_type, source_id, title, format, storage_path, meta, is_public, created_by, created_at, universes!inner(title, slug)')
    .eq('kind', 'notebook')
    .eq('created_by', session.userId)
    .eq('universes.slug', universeSlug)
    .order('created_at', { ascending: false })
    .limit(20);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const universe = Array.isArray(row.universes) ? row.universes[0] : row.universes;
    return {
      id: String(row.id),
      universe_id: String(row.universe_id),
      kind: 'notebook',
      thread_id: null,
      trail_id: null,
      session_id: null,
      title: String(row.title),
      format: row.format === 'md' ? 'md' : 'pdf',
      storage_path: String(row.storage_path),
      meta: (row.meta ?? {}) as Record<string, unknown>,
      source_type: null,
      source_id: null,
      is_public: Boolean(row.is_public),
      created_by: typeof row.created_by === 'string' ? row.created_by : null,
      created_at: String(row.created_at),
      universe_title: typeof universe?.title === 'string' ? universe.title : universeSlug,
      universe_slug: typeof universe?.slug === 'string' ? universe.slug : universeSlug,
    } satisfies UserNotebookExportListItem;
  });
}

export async function toggleOwnNotebookExportPublic(input: { exportId: string; isPublic: boolean }) {
  const session = await getCurrentSession();
  if (!session) throw new Error('forbidden');
  const db = getAdminService();
  if (!db) throw new Error('db_not_configured');
  const { data: row } = await db.from('exports').select('id, created_by').eq('id', input.exportId).eq('kind', 'notebook').maybeSingle();
  if (!row) throw new Error('not_found');
  const canPrivileged = session.role === 'admin' || session.role === 'editor';
  const isOwner = row.created_by === session.userId;
  if (!canPrivileged && !isOwner) throw new Error('forbidden');
  await db.from('exports').update({ is_public: input.isPublic }).eq('id', input.exportId);
}

export async function getUniverseTitleBySlug(slug: string) {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data } = await db.from('universes').select('title').eq('slug', slug).maybeSingle();
  return data?.title ?? null;
}
