import { NextResponse } from 'next/server';
import { getSharedNotebook, removeSharedNotebookItem } from '@/lib/shared-notebooks/notebooks';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const universeSlug = url.searchParams.get('universeSlug')?.trim() ?? '';
  if (!universeSlug || !id) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const notebook = await getSharedNotebook({ universeSlug, notebookIdOrSlug: id });
  if (!notebook) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ notebook });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const universeSlug = url.searchParams.get('universeSlug')?.trim() ?? '';
  const itemId = url.searchParams.get('itemId')?.trim() ?? '';
  if (!universeSlug || !id || !itemId) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const ok = await removeSharedNotebookItem({ universeSlug, notebookId: id, itemId });
  if (!ok) return NextResponse.json({ error: 'forbidden_or_not_found' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
