import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type SharePackChecklistChecks = {
  reviewed: string[];
  posted: {
    instagram: boolean;
    whatsapp: boolean;
    telegram: boolean;
    twitter: boolean;
  };
  reminder: {
    enabled: boolean;
    mode: 'instructions';
  };
};

export type SharePackChecklistRow = {
  pack_id: string;
  universe_id: string;
  checks: SharePackChecklistChecks;
  updated_by: string | null;
  updated_at: string;
};

const DEFAULT_CHECKS: SharePackChecklistChecks = {
  reviewed: [],
  posted: {
    instagram: false,
    whatsapp: false,
    telegram: false,
    twitter: false,
  },
  reminder: {
    enabled: false,
    mode: 'instructions',
  },
};

function normalizeChecks(raw: unknown): SharePackChecklistChecks {
  const base = typeof raw === 'object' && raw ? (raw as Record<string, unknown>) : {};
  const reviewed = Array.isArray(base.reviewed)
    ? Array.from(new Set(base.reviewed.map((item) => String(item).trim()).filter(Boolean))).slice(0, 64)
    : [];
  const postedRaw =
    typeof base.posted === 'object' && base.posted
      ? (base.posted as Record<string, unknown>)
      : {};
  const reminderRaw =
    typeof base.reminder === 'object' && base.reminder
      ? (base.reminder as Record<string, unknown>)
      : {};
  return {
    reviewed,
    posted: {
      instagram: Boolean(postedRaw.instagram),
      whatsapp: Boolean(postedRaw.whatsapp),
      telegram: Boolean(postedRaw.telegram),
      twitter: Boolean(postedRaw.twitter),
    },
    reminder: {
      enabled: Boolean(reminderRaw.enabled),
      mode: 'instructions',
    },
  };
}

export function getDefaultSharePackChecklistChecks() {
  return {
    reviewed: [...DEFAULT_CHECKS.reviewed],
    posted: { ...DEFAULT_CHECKS.posted },
    reminder: { ...DEFAULT_CHECKS.reminder },
  };
}

export async function getSharePackChecklist(packId: string): Promise<SharePackChecklistRow | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data } = await db
    .from('share_pack_checklists')
    .select('pack_id, universe_id, checks, updated_by, updated_at')
    .eq('pack_id', packId)
    .maybeSingle();
  if (!data) return null;
  return {
    pack_id: data.pack_id,
    universe_id: data.universe_id,
    checks: normalizeChecks(data.checks),
    updated_by: data.updated_by ?? null,
    updated_at: data.updated_at,
  };
}

export async function upsertSharePackChecklist(input: {
  packId: string;
  universeId: string;
  checks: SharePackChecklistChecks;
  updatedBy: string;
}): Promise<SharePackChecklistRow | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;
  const { data } = await db
    .from('share_pack_checklists')
    .upsert(
      {
        pack_id: input.packId,
        universe_id: input.universeId,
        checks: normalizeChecks(input.checks),
        updated_by: input.updatedBy,
      },
      { onConflict: 'pack_id' },
    )
    .select('pack_id, universe_id, checks, updated_by, updated_at')
    .maybeSingle();

  if (!data) return null;
  return {
    pack_id: data.pack_id,
    universe_id: data.universe_id,
    checks: normalizeChecks(data.checks),
    updated_by: data.updated_by ?? null,
    updated_at: data.updated_at,
  };
}
