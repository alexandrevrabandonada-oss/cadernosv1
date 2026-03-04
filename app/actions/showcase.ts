'use server';

import { autoPickHighlights, publishShowcaseUniverse, upsertUniverseHighlights } from '@/lib/demo/highlights';
import { requireAdmin, requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';

function parseCsvIds(raw: string, max = 24) {
  return Array.from(new Set(raw.split(',').map((value) => value.trim()).filter(Boolean))).slice(0, max);
}

function parseQuestionLines(raw: string, max = 6) {
  return Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ).slice(0, max);
}

export async function autoPickHighlightsAction(universeId: string) {
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/highlights/autopick`);
  if (!rl.ok) return { ok: false, message: `Rate limit. Tente em ${rl.retryAfterSec}s.` };
  const data = await autoPickHighlights(universeId, session.userId);
  if (!data) return { ok: false, message: 'Falha ao auto-selecionar destaques.' };
  return { ok: true, message: 'Destaques auto-selecionados.', data };
}

export async function saveHighlightsAction(input: {
  universeId: string;
  evidenceIdsCsv: string;
  eventIdsCsv: string;
  questionPromptsText: string;
}) {
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${input.universeId}/highlights/save`);
  if (!rl.ok) return { ok: false, message: `Rate limit. Tente em ${rl.retryAfterSec}s.` };
  const data = await upsertUniverseHighlights({
    universeId: input.universeId,
    evidenceIds: parseCsvIds(input.evidenceIdsCsv, 6),
    eventIds: parseCsvIds(input.eventIdsCsv, 3),
    questionPrompts: parseQuestionLines(input.questionPromptsText, 6),
    updatedBy: session.userId,
  });
  if (!data) return { ok: false, message: 'Falha ao salvar highlights.' };
  return { ok: true, message: 'Highlights salvos com sucesso.' };
}

export async function publishShowcaseUniverseAction(input: { universeId: string; force?: boolean }) {
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${input.universeId}/showcase/publish`);
  if (!rl.ok) return { ok: false, message: `Rate limit. Tente em ${rl.retryAfterSec}s.` };
  const force = Boolean(input.force);
  if (force) {
    await requireAdmin();
  }
  const result = await publishShowcaseUniverse({
    universeId: input.universeId,
    force,
    updatedBy: session.userId,
  });
  return result;
}

