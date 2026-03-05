'use server';

import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import {
  ensureWeeklyPackForUniverse,
  type DistributionChannel,
  upsertDistributionSettings,
  upsertSharePackPostStatus,
} from '@/lib/share/scheduler';
import { getSharePackChecklist, getDefaultSharePackChecklistChecks, upsertSharePackChecklist } from '@/lib/share/checklist';

type ActionResult = {
  ok: boolean;
  message: string;
};

function parseChannels(values: string[]): DistributionChannel[] {
  const valid = values
    .map((value) => value.trim().toLowerCase())
    .filter(
      (value): value is DistributionChannel =>
        value === 'instagram' || value === 'whatsapp' || value === 'telegram' || value === 'twitter' || value === 'other',
    );
  const unique = Array.from(new Set(valid));
  return unique.length > 0 ? unique : ['instagram', 'whatsapp', 'telegram'];
}

export async function saveDistributionSettingsAction(input: {
  universeId: string;
  weeklyPackEnabled: boolean;
  weeklyDay: number;
  weeklyHour: number;
  timezone: string;
  channels: string[];
}): Promise<ActionResult> {
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${input.universeId}/distribution/save`);
  if (!rl.ok) return { ok: false, message: `Rate limit. Tente em ${rl.retryAfterSec}s.` };

  const saved = await upsertDistributionSettings({
    universeId: input.universeId,
    weeklyPackEnabled: input.weeklyPackEnabled,
    weeklyDay: input.weeklyDay,
    weeklyHour: input.weeklyHour,
    timezone: input.timezone || 'America/Sao_Paulo',
    channels: parseChannels(input.channels),
    updatedBy: session.userId,
  });
  if (!saved) return { ok: false, message: 'Falha ao salvar configuracoes de distribuicao.' };
  return { ok: true, message: 'Configuracoes de distribuicao salvas.' };
}

export async function runWeeklyPackNowAction(universeId: string): Promise<ActionResult> {
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/distribution/run-now`);
  if (!rl.ok) return { ok: false, message: `Rate limit. Tente em ${rl.retryAfterSec}s.` };

  const result = await ensureWeeklyPackForUniverse({
    universeId,
    runKind: 'manual',
    now: new Date(),
    updatedBy: session.userId,
    force: true,
  });

  if (result.skipped) {
    return { ok: false, message: `Execucao pulada: ${result.reason ?? 'motivo nao informado'}.` };
  }
  return {
    ok: true,
    message: `Execucao manual concluida (week ${result.weekKey}, created=${result.created}, regenerated=${result.regenerated}).`,
  };
}

export async function setSharePackPostStatusAction(input: {
  packId: string;
  universeId: string;
  channel: DistributionChannel;
  status: 'pending' | 'posted' | 'skipped';
  postUrl?: string;
  note?: string;
}): Promise<ActionResult> {
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, `admin/share-pack/${input.packId}/channel/${input.channel}`);
  if (!rl.ok) return { ok: false, message: `Rate limit. Tente em ${rl.retryAfterSec}s.` };

  const row = await upsertSharePackPostStatus({
    packId: input.packId,
    universeId: input.universeId,
    channel: input.channel,
    status: input.status,
    postUrl: input.postUrl ?? null,
    note: input.note ?? null,
    updatedBy: session.userId,
  });
  if (!row) return { ok: false, message: 'Falha ao atualizar status de postagem.' };

  const checklistRow = await getSharePackChecklist(input.packId);
  const checks = checklistRow?.checks ?? getDefaultSharePackChecklistChecks();
  if (input.channel in checks.posted) {
    checks.posted[input.channel as 'instagram' | 'whatsapp' | 'telegram' | 'twitter'] = input.status === 'posted';
    await upsertSharePackChecklist({
      packId: input.packId,
      universeId: input.universeId,
      checks,
      updatedBy: session.userId,
    });
  }

  return {
    ok: true,
    message:
      input.status === 'posted'
        ? `${input.channel} marcado como postado.`
        : input.status === 'skipped'
          ? `${input.channel} marcado como skipped.`
          : `${input.channel} voltou para pending.`,
  };
}

