'use server';

import { runCurationSprint, type SprintOptions } from '@/lib/curation/sprint';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit, enforceIngestLimit } from '@/lib/ratelimit/enforce';

function normalizeOpts(options: SprintOptions = {}) {
  return {
    mode: options.mode === 'all' ? 'all' : 'core',
    targetDocsPerNode: options.targetDocsPerNode ?? 3,
    targetEvidencesPerNode: options.targetEvidencesPerNode ?? 3,
    targetQuestionsPerNode: options.targetQuestionsPerNode ?? 3,
    maxNodes: options.maxNodes ?? 8,
    dryRun: Boolean(options.dryRun),
  } satisfies SprintOptions;
}

export async function runSprintAction(universeId: string, options: SprintOptions = {}) {
  const session = await requireEditorOrAdmin();
  if (!universeId) return null;

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/sprint/run`);
  if (!adminRl.ok) {
    return { ok: false, message: `Rate limit escrita. Tente em ${adminRl.retryAfterSec}s.` };
  }
  const ingestRl = await enforceIngestLimit(session.userId);
  if (!ingestRl.ok) {
    return { ok: false, message: `Rate limit ingest. Tente em ${ingestRl.retryAfterSec}s.` };
  }

  const result = await runCurationSprint(universeId, {
    ...normalizeOpts(options),
    dryRun: false,
    actorUserId: session.userId,
  });
  if (!result) return { ok: false, message: 'Nao foi possivel executar o sprint.' };
  return {
    ok: true,
    message: `Sprint concluido: nos ${result.nodesProcessed}, docs +${result.actions.linksAdded}, evidencias +${result.actions.evidencesPromoted}, perguntas +${result.actions.questionsAdded}.`,
    result,
  };
}

export async function dryRunSprintAction(universeId: string, options: SprintOptions = {}) {
  const session = await requireEditorOrAdmin();
  if (!universeId) return null;

  const adminRl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/sprint/dry_run`);
  if (!adminRl.ok) {
    return { ok: false, message: `Rate limit escrita. Tente em ${adminRl.retryAfterSec}s.` };
  }

  const result = await runCurationSprint(universeId, {
    ...normalizeOpts(options),
    dryRun: true,
    actorUserId: session.userId,
  });
  if (!result) return { ok: false, message: 'Nao foi possivel executar dry-run.' };
  return {
    ok: true,
    message: `Dry-run: nos ${result.nodesProcessed}, docs +${result.actions.linksAdded}, evidencias +${result.actions.evidencesPromoted}, perguntas +${result.actions.questionsAdded}.`,
    result,
  };
}

