import { NextResponse } from 'next/server';
import { createSharedNotebookExport } from '@/lib/shared-notebooks/notebooks';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const universeSlug = typeof source.universeSlug === 'string' ? source.universeSlug.trim() : '';
  const notebookId = typeof source.notebookId === 'string' ? source.notebookId.trim() : '';
  const format = source.format === 'md' ? 'md' : 'pdf';
  if (!universeSlug || !notebookId) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  try {
    const result = await createSharedNotebookExport({ universeSlug, notebookIdOrSlug: notebookId, format });
    return NextResponse.json({ ok: true, title: result.title, assets: result.assets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'export_failed' }, { status: 403 });
  }
}
