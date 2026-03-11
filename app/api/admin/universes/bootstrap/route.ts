import { NextResponse } from 'next/server';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { bootstrapUniverseWorkflow, normalizeCloneOptions } from '@/lib/universe/bootstrap';
import type { UniverseBootstrapTemplateId } from '@/lib/universe/bootstrapTemplates';

export async function POST(request: Request) {
  const session = await requireEditorOrAdmin();
  const payload = (await request.json().catch(() => null)) as {
    title?: string;
    slug?: string;
    summary?: string;
    publishNow?: boolean;
    mode?: 'template' | 'clone';
    templateId?: UniverseBootstrapTemplateId | null;
    sourceUniverseId?: string | null;
    cloneOptions?: Record<string, boolean> | null;
  } | null;

  if (!payload?.title || !payload?.slug) {
    return NextResponse.json({ ok: false, error: 'missing_required_fields' }, { status: 400 });
  }

  const created = await bootstrapUniverseWorkflow({
    mode: payload.mode === 'clone' ? 'clone' : 'template',
    universe: {
      title: payload.title,
      slug: payload.slug,
      summary: payload.summary?.trim() || 'Universo em preparacao.',
      publishNow: Boolean(payload.publishNow),
    },
    templateId: payload.templateId ?? 'blank_minimal',
    sourceUniverseId: payload.sourceUniverseId ?? null,
    cloneOptions: normalizeCloneOptions(payload.cloneOptions ?? undefined),
    userId: session.userId,
  });

  return NextResponse.json({
    ok: true,
    universe: {
      id: created.id,
      slug: created.slug,
      title: created.title,
    },
  });
}
