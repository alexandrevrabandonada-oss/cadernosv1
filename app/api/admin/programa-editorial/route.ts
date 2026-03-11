import { NextResponse } from 'next/server';
import { slugify } from '@/lib/admin/db';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import {
  applySuggestedLanes,
  createEditorialBatch,
  createEditorialProgram,
  getProgramBoard,
  getEditorialProgram,
  moveProgramItem,
  type EditorialLane,
} from '@/lib/editorial/program';
import { EDITORIAL_PROGRAM_2026, ensureEditorialProgram2026Batch } from '@/lib/editorial/programBatch';
import type { UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';

export async function POST(request: Request) {
  await requireEditorOrAdmin();
  const payload = (await request.json().catch(() => null)) as
    | {
        action?: 'create_program' | 'create_batch' | 'move_item' | 'apply_suggestions' | 'ensure_main_batch';
        title?: string;
        slug?: string;
        summary?: string;
        programId?: string;
        programSlug?: string;
        universes?: Array<{ title: string; slug?: string; summary?: string; templateId: UniverseBootstrapTemplateId; priority?: number }>;
        itemId?: string;
        lane?: EditorialLane;
        priority?: number;
        note?: string;
      }
    | null;

  if (!payload?.action) {
    return NextResponse.json({ ok: false, error: 'missing_action' }, { status: 400 });
  }

  if (payload.action === 'ensure_main_batch') {
    const batch = await ensureEditorialProgram2026Batch();
    return NextResponse.json({ ok: true, program: batch.program, universes: batch.universes, programSlug: EDITORIAL_PROGRAM_2026.slug });
  }

  if (payload.action === 'create_program') {
    if (!payload.title) {
      return NextResponse.json({ ok: false, error: 'missing_title' }, { status: 400 });
    }
    const program = await createEditorialProgram({
      title: payload.title,
      slug: slugify(payload.slug?.trim() || payload.title),
      summary: payload.summary?.trim() || null,
    });
    return NextResponse.json({ ok: true, program });
  }

  if (payload.action === 'create_batch') {
    const ref = payload.programId || payload.programSlug;
    if (!ref || !Array.isArray(payload.universes) || payload.universes.length === 0) {
      return NextResponse.json({ ok: false, error: 'missing_batch_payload' }, { status: 400 });
    }
    const program = await getEditorialProgram(ref);
    if (!program) {
      return NextResponse.json({ ok: false, error: 'program_not_found' }, { status: 404 });
    }
    const universes = await createEditorialBatch({
      programId: program.id,
      universes: payload.universes.map((item) => ({
        title: item.title,
        slug: slugify(item.slug?.trim() || item.title),
        summary: item.summary?.trim() || undefined,
        templateId: item.templateId,
        priority: item.priority,
      })),
    });
    return NextResponse.json({ ok: true, universes });
  }

  if (payload.action === 'move_item') {
    if (!payload.itemId || !payload.lane) {
      return NextResponse.json({ ok: false, error: 'missing_move_payload' }, { status: 400 });
    }
    const item = await moveProgramItem({
      itemId: payload.itemId,
      lane: payload.lane,
      priority: payload.priority,
      note: payload.note,
    });
    return NextResponse.json({ ok: true, item });
  }

  const ref = payload.programId || payload.programSlug;
  if (!ref) {
    return NextResponse.json({ ok: false, error: 'missing_program_ref' }, { status: 400 });
  }
  const board = await applySuggestedLanes(ref);
  return NextResponse.json({ ok: true, board });
}

export async function GET(request: Request) {
  await requireEditorOrAdmin();
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('program')?.trim();
  if (!ref) {
    return NextResponse.json({ ok: false, error: 'missing_program' }, { status: 400 });
  }
  const board = await getProgramBoard(ref);
  if (!board) {
    return NextResponse.json({ ok: false, error: 'program_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, board });
}

