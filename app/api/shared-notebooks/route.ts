import { NextResponse } from 'next/server';
import { addItemToSharedNotebook, createSharedNotebook, listAvailableNotebooksForUser, listSharedNotebooks } from '@/lib/shared-notebooks/notebooks';
import type { AddSharedNotebookItemInput, CreateSharedNotebookInput, SharedNotebookTemplateId, SharedNotebookVisibility } from '@/lib/shared-notebooks/types';

function parseVisibility(value: unknown): SharedNotebookVisibility {
  return value === 'private' || value === 'public' ? value : 'team';
}


function parseTemplateId(value: unknown): SharedNotebookTemplateId | null {
  return value === 'weekly_base' || value === 'clipping' || value === 'study_group' || value === 'thematic_core' || value === 'blank' ? value : null;
}
function sanitizeCreate(body: unknown): CreateSharedNotebookInput | null {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const universeSlug = typeof source.universeSlug === 'string' ? source.universeSlug.trim() : '';
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  if (!universeSlug || !title) return null;
  return {
    universeSlug,
    title,
    summary: typeof source.summary === 'string' ? source.summary : null,
    visibility: parseVisibility(source.visibility),
    templateId: parseTemplateId(source.templateId),
    templateMeta: source.templateMeta && typeof source.templateMeta === 'object' ? (source.templateMeta as Record<string, unknown>) : null,
  };
}

function sanitizeAddItem(body: unknown): AddSharedNotebookItemInput | null {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const notebookId = typeof source.notebookId === 'string' ? source.notebookId.trim() : '';
  const universeSlug = typeof source.universeSlug === 'string' ? source.universeSlug.trim() : '';
  const sourceType = typeof source.sourceType === 'string' ? source.sourceType.trim() : '';
  const text = typeof source.text === 'string' ? source.text.trim() : '';
  if (!notebookId || !universeSlug || !sourceType || !text) return null;
  return {
    notebookId,
    universeSlug,
    sourceType: sourceType as AddSharedNotebookItemInput['sourceType'],
    sourceId: typeof source.sourceId === 'string' ? source.sourceId : null,
    sourceMeta: source.sourceMeta && typeof source.sourceMeta === 'object' ? (source.sourceMeta as Record<string, unknown>) : {},
    title: typeof source.title === 'string' ? source.title : null,
    text,
    tags: Array.isArray(source.tags) ? source.tags.map((item) => String(item)) : [],
    note: typeof source.note === 'string' ? source.note : null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const universeSlug = url.searchParams.get('universeSlug')?.trim() ?? '';
  if (!universeSlug) return NextResponse.json({ error: 'invalid_universe_slug' }, { status: 400 });
  const mode = url.searchParams.get('mode') ?? 'list';
  if (mode === 'available') {
    const sourceType = url.searchParams.get('sourceType')?.trim() || null;
    const items = await listAvailableNotebooksForUser(universeSlug, sourceType as AddSharedNotebookItemInput['sourceType'] | null);
    return NextResponse.json({ items });
  }
  const result = await listSharedNotebooks(universeSlug);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  if (source.action === 'add_item') {
    const payload = sanitizeAddItem(body);
    if (!payload) return NextResponse.json({ error: 'invalid_item_payload' }, { status: 400 });
    try {
      const item = await addItemToSharedNotebook(payload);
      return NextResponse.json({ ok: true, item });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'add_failed' }, { status: 401 });
    }
  }
  const payload = sanitizeCreate(body);
  if (!payload) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  try {
    const notebook = await createSharedNotebook(payload);
    return NextResponse.json({ ok: true, notebook });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'create_failed' }, { status: 401 });
  }
}

