'use server';

import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { enforceAdminWriteLimit } from '@/lib/ratelimit/enforce';
import { setSharePackPinned, upsertWeeklyPack } from '@/lib/share/pack';

type SharePackActionResult = {
  ok: boolean;
  message: string;
};

export async function generateWeeklySharePackAction(
  universeId: string,
  options: { pin?: boolean; weekKey?: string } = {},
): Promise<SharePackActionResult> {
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, `admin/universes/${universeId}/share-pack/generate`);
  if (!rl.ok) return { ok: false, message: `Rate limit. Tente em ${rl.retryAfterSec}s.` };

  const result = await upsertWeeklyPack(
    {
      universeId,
      createdBy: session.userId,
      pin: options.pin,
      weekKey: options.weekKey,
    },
    { force: false },
  );

  return {
    ok: result.ok,
    message: result.message,
  };
}

export async function setSharePackPinnedAction(packId: string, isPinned: boolean): Promise<SharePackActionResult> {
  const session = await requireEditorOrAdmin();
  const rl = await enforceAdminWriteLimit(session.userId, `admin/share-pack/${packId}/pin`);
  if (!rl.ok) return { ok: false, message: `Rate limit. Tente em ${rl.retryAfterSec}s.` };
  const row = await setSharePackPinned(packId, isPinned);
  if (!row) return { ok: false, message: 'Nao foi possivel atualizar fixacao do pack.' };
  return {
    ok: true,
    message: isPinned ? 'Pack fixado com sucesso.' : 'Pack desfixado com sucesso.',
  };
}
