import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { getDefaultSharePackChecklistChecks, upsertSharePackChecklist } from '@/lib/share/checklist';
import { getWeeklyPack, listWeeklyPacks, type SharePackRow, upsertWeeklyPack } from '@/lib/share/pack';
import { getWeekKey, getNextScheduledRun } from '@/lib/share/week';

export type DistributionChannel = 'instagram' | 'whatsapp' | 'telegram' | 'twitter' | 'other';

export type UniverseDistributionSettingsRow = {
  universe_id: string;
  weekly_pack_enabled: boolean;
  weekly_day: number;
  weekly_hour: number;
  timezone: string;
  channels: DistributionChannel[];
  updated_by: string | null;
  updated_at: string;
};

export type SharePackPostRow = {
  id: string;
  pack_id: string;
  universe_id: string;
  channel: DistributionChannel;
  status: 'pending' | 'posted' | 'skipped';
  posted_at: string | null;
  post_url: string | null;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type SharePackRunRow = {
  id: string;
  universe_id: string;
  week_key: string;
  run_kind: 'cron' | 'manual';
  ok: boolean;
  summary: Record<string, unknown>;
  created_at: string;
};

const schedulerStore = globalThis as typeof globalThis & {
  __cvMockDistributionSettings?: Map<string, UniverseDistributionSettingsRow>;
  __cvMockSharePackPosts?: Map<string, SharePackPostRow>;
  __cvMockSharePackRuns?: Map<string, SharePackRunRow>;
};

function isTestSeed() {
  return process.env.TEST_SEED === '1';
}

function getMockDistributionSettingsStore() {
  if (!schedulerStore.__cvMockDistributionSettings) {
    schedulerStore.__cvMockDistributionSettings = new Map<string, UniverseDistributionSettingsRow>();
  }
  return schedulerStore.__cvMockDistributionSettings;
}

function getMockSharePackPostsStore() {
  if (!schedulerStore.__cvMockSharePackPosts) {
    schedulerStore.__cvMockSharePackPosts = new Map<string, SharePackPostRow>();
  }
  return schedulerStore.__cvMockSharePackPosts;
}

function getMockSharePackRunsStore() {
  if (!schedulerStore.__cvMockSharePackRuns) {
    schedulerStore.__cvMockSharePackRuns = new Map<string, SharePackRunRow>();
  }
  return schedulerStore.__cvMockSharePackRuns;
}

export type EnsureWeeklyPackResult = {
  universeId: string;
  weekKey: string;
  skipped: boolean;
  reason?: string;
  packId: string | null;
  created: boolean;
  regenerated: boolean;
  postsInitialized: number;
};

const DEFAULT_CHANNELS: DistributionChannel[] = ['instagram', 'whatsapp', 'telegram'];

function normalizeChannels(channels: unknown): DistributionChannel[] {
  const raw = Array.isArray(channels) ? channels : DEFAULT_CHANNELS;
  const valid = raw
    .map((item) => String(item).trim().toLowerCase())
    .filter((item): item is DistributionChannel =>
      ['instagram', 'whatsapp', 'telegram', 'twitter', 'other'].includes(item),
    );
  const unique = Array.from(new Set(valid));
  return unique.length > 0 ? unique : [...DEFAULT_CHANNELS];
}

function parseSummary(raw: unknown) {
  return typeof raw === 'object' && raw ? (raw as Record<string, unknown>) : {};
}

export async function getDistributionSettings(universeId: string): Promise<UniverseDistributionSettingsRow | null> {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return null;
    const store = getMockDistributionSettingsStore();
    if (!store.has(universeId)) {
      store.set(universeId, {
        universe_id: universeId,
        weekly_pack_enabled: true,
        weekly_day: 1,
        weekly_hour: 9,
        timezone: 'America/Sao_Paulo',
        channels: ['instagram', 'whatsapp', 'telegram'],
        updated_by: 'test-seed',
        updated_at: new Date().toISOString(),
      });
    }
    return store.get(universeId) ?? null;
  }
  const { data } = await db
    .from('universe_distribution_settings')
    .select('*')
    .eq('universe_id', universeId)
    .maybeSingle();
  if (!data) return null;
  return {
    universe_id: data.universe_id,
    weekly_pack_enabled: Boolean(data.weekly_pack_enabled),
    weekly_day: Number(data.weekly_day ?? 1),
    weekly_hour: Number(data.weekly_hour ?? 9),
    timezone: String(data.timezone ?? 'America/Sao_Paulo'),
    channels: normalizeChannels(data.channels),
    updated_by: data.updated_by ?? null,
    updated_at: data.updated_at,
  };
}

export async function upsertDistributionSettings(input: {
  universeId: string;
  weeklyPackEnabled: boolean;
  weeklyDay: number;
  weeklyHour: number;
  timezone: string;
  channels: DistributionChannel[];
  updatedBy: string;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return null;
    const row: UniverseDistributionSettingsRow = {
      universe_id: input.universeId,
      weekly_pack_enabled: input.weeklyPackEnabled,
      weekly_day: Math.max(1, Math.min(7, Math.floor(input.weeklyDay))),
      weekly_hour: Math.max(0, Math.min(23, Math.floor(input.weeklyHour))),
      timezone: input.timezone || 'America/Sao_Paulo',
      channels: normalizeChannels(input.channels),
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    };
    getMockDistributionSettingsStore().set(input.universeId, row);
    return row;
  }
  const { data } = await db
    .from('universe_distribution_settings')
    .upsert(
      {
        universe_id: input.universeId,
        weekly_pack_enabled: input.weeklyPackEnabled,
        weekly_day: Math.max(1, Math.min(7, Math.floor(input.weeklyDay))),
        weekly_hour: Math.max(0, Math.min(23, Math.floor(input.weeklyHour))),
        timezone: input.timezone || 'America/Sao_Paulo',
        channels: normalizeChannels(input.channels),
        updated_by: input.updatedBy,
      },
      { onConflict: 'universe_id' },
    )
    .select('*')
    .maybeSingle();
  if (!data) return null;
  return getDistributionSettings(data.universe_id);
}

async function ensureSharePackPosts(input: {
  universeId: string;
  packId: string;
  channels: DistributionChannel[];
  updatedBy: string | null;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return 0;
    const store = getMockSharePackPostsStore();
    let inserted = 0;
    for (const channel of input.channels) {
      const key = `${input.packId}:${channel}`;
      if (store.has(key)) continue;
      store.set(key, {
        id: `mock-post-${key}`,
        pack_id: input.packId,
        universe_id: input.universeId,
        channel,
        status: 'pending',
        posted_at: null,
        post_url: null,
        note: null,
        updated_by: input.updatedBy ?? null,
        updated_at: new Date().toISOString(),
      });
      inserted += 1;
    }
    return inserted;
  }
  const { data: currentRows } = await db
    .from('share_pack_posts')
    .select('channel')
    .eq('pack_id', input.packId);
  const existing = new Set((currentRows ?? []).map((row) => row.channel as DistributionChannel));
  const toInsert = input.channels
    .filter((channel) => !existing.has(channel))
    .map((channel) => ({
      pack_id: input.packId,
      universe_id: input.universeId,
      channel,
      status: 'pending',
      updated_by: input.updatedBy,
    }));
  if (toInsert.length === 0) return 0;
  await db.from('share_pack_posts').insert(toInsert);
  return toInsert.length;
}

export async function listSharePackPosts(packId: string): Promise<SharePackPostRow[]> {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return [];
    return Array.from(getMockSharePackPostsStore().values()).filter((row) => row.pack_id === packId);
  }
  const { data } = await db
    .from('share_pack_posts')
    .select('*')
    .eq('pack_id', packId)
    .order('channel', { ascending: true });
  return ((data ?? []) as SharePackPostRow[]).map((row) => ({
    ...row,
    channel: row.channel,
    status: row.status,
  }));
}

export async function upsertSharePackPostStatus(input: {
  packId: string;
  universeId: string;
  channel: DistributionChannel;
  status: 'pending' | 'posted' | 'skipped';
  postUrl?: string | null;
  note?: string | null;
  updatedBy: string;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return null;
    const key = `${input.packId}:${input.channel}`;
    const current = getMockSharePackPostsStore().get(key);
    const postedAt = input.status === 'posted' ? new Date().toISOString() : null;
    const row: SharePackPostRow = {
      id: current?.id ?? `mock-post-${key}`,
      pack_id: input.packId,
      universe_id: input.universeId,
      channel: input.channel,
      status: input.status,
      posted_at: postedAt,
      post_url: input.postUrl ?? null,
      note: input.note ?? null,
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    };
    getMockSharePackPostsStore().set(key, row);
    return row;
  }
  const postedAt = input.status === 'posted' ? new Date().toISOString() : null;
  const { data } = await db
    .from('share_pack_posts')
    .upsert(
      {
        pack_id: input.packId,
        universe_id: input.universeId,
        channel: input.channel,
        status: input.status,
        posted_at: postedAt,
        post_url: input.postUrl ?? null,
        note: input.note ?? null,
        updated_by: input.updatedBy,
      },
      { onConflict: 'pack_id,channel' },
    )
    .select('*')
    .maybeSingle();
  return (data as SharePackPostRow | null) ?? null;
}

async function insertSharePackRun(input: {
  universeId: string;
  weekKey: string;
  runKind: 'cron' | 'manual';
  ok: boolean;
  summary: Record<string, unknown>;
}) {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return;
    const id = `mock-run-${input.universeId}-${input.weekKey}-${Date.now()}`;
    getMockSharePackRunsStore().set(id, {
      id,
      universe_id: input.universeId,
      week_key: input.weekKey,
      run_kind: input.runKind,
      ok: input.ok,
      summary: input.summary,
      created_at: new Date().toISOString(),
    });
    return;
  }
  await db.from('share_pack_runs').insert({
    universe_id: input.universeId,
    week_key: input.weekKey,
    run_kind: input.runKind,
    ok: input.ok,
    summary: input.summary,
  });
}

export async function ensureWeeklyPackForUniverse(input: {
  universeId: string;
  now?: Date;
  runKind: 'cron' | 'manual';
  updatedBy?: string | null;
  force?: boolean;
}): Promise<EnsureWeeklyPackResult> {
  const settings = await getDistributionSettings(input.universeId);
  const now = input.now ?? new Date();
  const timezone = settings?.timezone ?? 'America/Sao_Paulo';
  const weekKey = getWeekKey(now, timezone);

  if (!settings?.weekly_pack_enabled) {
    return {
      universeId: input.universeId,
      weekKey,
      skipped: true,
      reason: 'weekly_pack_disabled',
      packId: null,
      created: false,
      regenerated: false,
      postsInitialized: 0,
    };
  }

  const existing = await getWeeklyPack(input.universeId, weekKey);
  let pack: SharePackRow | null = existing;
  let created = false;
  let regenerated = false;
  if (!existing) {
    const upserted = await upsertWeeklyPack(
      {
        universeId: input.universeId,
        createdBy: input.updatedBy ?? 'cron',
        weekKey,
      },
      { force: true },
    );
    if (!upserted.ok || !upserted.pack) {
      await insertSharePackRun({
        universeId: input.universeId,
        weekKey,
        runKind: input.runKind,
        ok: false,
        summary: { error: 'pack_upsert_failed' },
      });
      return {
        universeId: input.universeId,
        weekKey,
        skipped: true,
        reason: 'pack_upsert_failed',
        packId: null,
        created: false,
        regenerated: false,
        postsInitialized: 0,
      };
    }
    pack = upserted.pack;
    created = true;
  } else if (!existing.is_pinned) {
    const shouldRegen = Boolean(input.force) || (existing.items ?? []).length < 3;
    if (shouldRegen) {
      const upserted = await upsertWeeklyPack(
        {
          universeId: input.universeId,
          createdBy: input.updatedBy ?? 'cron',
          weekKey,
          pin: false,
        },
        { force: true },
      );
      if (upserted.ok && upserted.pack) {
        pack = upserted.pack;
        regenerated = true;
      }
    }
  }

  if (!pack) {
    await insertSharePackRun({
      universeId: input.universeId,
      weekKey,
      runKind: input.runKind,
      ok: false,
      summary: { error: 'pack_missing_after_ensure' },
    });
    return {
      universeId: input.universeId,
      weekKey,
      skipped: true,
      reason: 'pack_missing_after_ensure',
      packId: null,
      created,
      regenerated,
      postsInitialized: 0,
    };
  }

  const channels = normalizeChannels(settings.channels);
  const postsInitialized = await ensureSharePackPosts({
    universeId: input.universeId,
    packId: pack.id,
    channels,
    updatedBy: input.updatedBy ?? null,
  });

  const checklist = getDefaultSharePackChecklistChecks();
  checklist.posted.instagram = false;
  checklist.posted.whatsapp = false;
  checklist.posted.telegram = false;
  checklist.posted.twitter = false;
  await upsertSharePackChecklist({
    packId: pack.id,
    universeId: input.universeId,
    checks: checklist,
    updatedBy: input.updatedBy ?? 'cron',
  });

  await insertSharePackRun({
    universeId: input.universeId,
    weekKey,
    runKind: input.runKind,
    ok: true,
    summary: {
      pack_id: pack.id,
      created,
      regenerated,
      postsInitialized,
      channels,
    },
  });

  return {
    universeId: input.universeId,
    weekKey,
    skipped: false,
    packId: pack.id,
    created,
    regenerated,
    postsInitialized,
  };
}

export async function ensureWeeklyPacksAllUniverses(input: {
  now?: Date;
  runKind: 'cron' | 'manual';
  updatedBy?: string | null;
  force?: boolean;
}) {
  const db = getSupabaseServiceRoleClient();
  let universeIds: string[] = [];
  if (!db) {
    if (!isTestSeed()) return { total: 0, processed: 0, skipped: 0, results: [] as EnsureWeeklyPackResult[] };
    universeIds = ['mock-demo'];
  } else {
    const { data: settingsRows } = await db
      .from('universe_distribution_settings')
      .select('universe_id, weekly_pack_enabled')
      .eq('weekly_pack_enabled', true)
      .limit(200);
    universeIds = (settingsRows ?? []).map((row) => row.universe_id);
  }
  const results: EnsureWeeklyPackResult[] = [];
  for (const universeId of universeIds) {
    const result = await ensureWeeklyPackForUniverse({
      universeId,
      now: input.now,
      runKind: input.runKind,
      updatedBy: input.updatedBy ?? null,
      force: input.force,
    });
    results.push(result);
  }
  return {
    total: universeIds.length,
    processed: results.filter((item) => !item.skipped).length,
    skipped: results.filter((item) => item.skipped).length,
    results,
  };
}

export async function listRecentSharePackRuns(universeId: string, limit = 10): Promise<SharePackRunRow[]> {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return [];
    return Array.from(getMockSharePackRunsStore().values())
      .filter((row) => row.universe_id === universeId)
      .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
      .slice(0, Math.max(1, Math.min(50, limit)));
  }
  const { data } = await db
    .from('share_pack_runs')
    .select('*')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(50, limit)));
  return ((data ?? []) as SharePackRunRow[]).map((row) => ({
    ...row,
    summary: parseSummary(row.summary),
  }));
}

export async function getLatestCronRun() {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    if (!isTestSeed()) return null;
    return (
      Array.from(getMockSharePackRunsStore().values())
        .filter((row) => row.run_kind === 'cron')
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))[0] ?? null
    );
  }
  const { data } = await db
    .from('share_pack_runs')
    .select('*')
    .eq('run_kind', 'cron')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as SharePackRunRow;
  return {
    ...row,
    summary: parseSummary(row.summary),
  };
}

export async function listDistributionHistory(universeId: string, limitWeeks = 12) {
  const packs = await listWeeklyPacks(universeId, limitWeeks);
  const db = getSupabaseServiceRoleClient();
  if (packs.length === 0) {
    return [];
  }
  if (!db) {
    if (!isTestSeed()) {
      return packs.map((pack) => ({
        pack,
        posts: [] as SharePackPostRow[],
        nextRunAt: null as string | null,
      }));
    }
    const settings = await getDistributionSettings(universeId);
    const nextRunAt = settings
      ? getNextScheduledRun(
          {
            weekly_day: settings.weekly_day,
            weekly_hour: settings.weekly_hour,
            timezone: settings.timezone,
          },
          new Date(),
        )
      : null;
    return packs.map((pack) => ({
      pack,
      posts: Array.from(getMockSharePackPostsStore().values()).filter((post) => post.pack_id === pack.id),
      nextRunAt,
    }));
  }
  const packIds = packs.map((pack) => pack.id);
  const { data: postsRaw } = await db
    .from('share_pack_posts')
    .select('*')
    .in('pack_id', packIds);
  const postsByPack = new Map<string, SharePackPostRow[]>();
  for (const row of (postsRaw ?? []) as SharePackPostRow[]) {
    const list = postsByPack.get(row.pack_id) ?? [];
    list.push(row);
    postsByPack.set(row.pack_id, list);
  }
  const settings = await getDistributionSettings(universeId);
  const nextRunAt = settings
    ? getNextScheduledRun(
        {
          weekly_day: settings.weekly_day,
          weekly_hour: settings.weekly_hour,
          timezone: settings.timezone,
        },
        new Date(),
      )
    : null;
  return packs.map((pack) => ({
    pack,
    posts: postsByPack.get(pack.id) ?? [],
    nextRunAt,
  }));
}
