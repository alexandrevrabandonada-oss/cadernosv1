import 'server-only';

import { getCurrentSession } from '@/lib/auth/server';
import { getHubData } from '@/lib/data/universe';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { getSupabaseServerAuthClient, getSupabaseServerClient } from '@/lib/supabase/server';
import { buildStudyRecapData } from '@/lib/study/aggregate';
import { recommendStudyNext, type StudyRecommendationEvidence, type StudyRecommendationNode } from '@/lib/study/recommend';
import type { StudyRecapData, StudySession } from '@/lib/study/types';
import { buildUniverseHref } from '@/lib/universeNav';

function mapSession(row: {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  focus_minutes: number | null;
  items: unknown;
  stats: unknown;
}) {
  return {
    id: row.id,
    universeSlug: '',
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: row.duration_sec,
    focusMinutes: row.focus_minutes,
    items: Array.isArray(row.items) ? row.items : [],
    stats: row.stats && typeof row.stats === 'object' ? (row.stats as Record<string, number>) : {},
  } satisfies StudySession;
}

function getDayKey(iso: string, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

async function getStudyContext(universeSlug: string) {
  const session = await getCurrentSession();
  if (!session || session.userId === 'dev-bypass') return null;
  const auth = await getSupabaseServerAuthClient();
  if (!auth) return null;
  const access = await getUniverseAccessBySlug(universeSlug);
  if (!access.universe || (!access.published && !access.canPreview)) return null;
  return { session, auth, universe: access.universe };
}

async function getRecommendationCandidates(slug: string, universeId: string) {
  const db = getSupabaseServerClient();
  const fallback = await getHubData(slug);
  const fallbackNodes: StudyRecommendationNode[] = fallback.coreNodes.slice(0, 8).map((node) => ({
    id: node.id,
    slug: node.slug ?? node.id,
    title: node.label,
    summary: node.summary ?? null,
    tags: node.tags ?? [],
  }));
  const fallbackEvidences: StudyRecommendationEvidence[] = fallback.featuredEvidences.slice(0, 6).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    href: buildUniverseHref(slug, 'provas'),
    nodeSlug: null,
    tags: [],
  }));

  if (!db) return { nodes: fallbackNodes, evidences: fallbackEvidences };

  const [{ data: nodesRaw }, { data: evidenceRaw }] = await Promise.all([
    db.from('nodes').select('id, slug, title, summary, tags').eq('universe_id', universeId).order('created_at', { ascending: true }).limit(24),
    db
      .from('evidences')
      .select('id, title, summary, node_id, nodes!left(slug, tags)')
      .eq('universe_id', universeId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  const nodes: StudyRecommendationNode[] = (nodesRaw ?? []).map((node) => ({
    id: node.id,
    slug: node.slug ?? node.id,
    title: node.title,
    summary: typeof node.summary === 'string' ? node.summary : null,
    tags: Array.isArray(node.tags) ? node.tags : [],
  }));

  const evidences: StudyRecommendationEvidence[] = (evidenceRaw ?? []).map((item) => {
    const relation = Array.isArray(item.nodes) ? item.nodes[0] : item.nodes;
    const nodeSlug = relation && typeof relation === 'object' && 'slug' in relation ? (relation.slug as string | null) : null;
    const tags = relation && typeof relation === 'object' && 'tags' in relation && Array.isArray(relation.tags) ? (relation.tags as string[]) : [];
    return {
      id: item.id,
      title: item.title,
      summary: typeof item.summary === 'string' ? item.summary : null,
      href: `${buildUniverseHref(slug, 'provas')}?selected=${item.id}&panel=detail`,
      nodeSlug,
      tags,
    };
  });

  return {
    nodes: nodes.length > 0 ? nodes : fallbackNodes,
    evidences: evidences.length > 0 ? evidences : fallbackEvidences,
  };
}

export async function upsertStudySession(input: {
  universeSlug: string;
  session: StudySession;
  timeZone?: string;
}) {
  const ctx = await getStudyContext(input.universeSlug);
  if (!ctx) return null;
  const existing = await ctx.auth
    .from('study_sessions')
    .select('id, ended_at')
    .eq('id', input.session.id)
    .eq('universe_id', ctx.universe.id)
    .eq('user_id', ctx.session.userId)
    .maybeSingle();

  const payload = {
    id: input.session.id,
    universe_id: ctx.universe.id,
    user_id: ctx.session.userId,
    started_at: input.session.startedAt,
    ended_at: input.session.endedAt,
    duration_sec: input.session.durationSec,
    focus_minutes: input.session.focusMinutes,
    items: input.session.items,
    stats: input.session.stats,
  };

  const { data } = await ctx.auth
    .from('study_sessions')
    .upsert(payload)
    .select('id, started_at, ended_at, duration_sec, focus_minutes, items, stats')
    .maybeSingle();

  if (!data) return null;

  if (input.session.endedAt && !existing.data?.ended_at) {
    const day = getDayKey(input.session.endedAt, input.timeZone ?? 'UTC');
    const currentDaily = await ctx.auth
      .from('study_daily')
      .select('id, focus_minutes, actions')
      .eq('universe_id', ctx.universe.id)
      .eq('user_id', ctx.session.userId)
      .eq('day', day)
      .maybeSingle();

    const actions = currentDaily.data?.actions && typeof currentDaily.data.actions === 'object'
      ? { ...(currentDaily.data.actions as Record<string, number>) }
      : {};
    for (const [key, value] of Object.entries(input.session.stats)) {
      actions[key] = (actions[key] ?? 0) + value;
    }

    await ctx.auth.from('study_daily').upsert({
      id: currentDaily.data?.id,
      universe_id: ctx.universe.id,
      user_id: ctx.session.userId,
      day,
      focus_minutes: (currentDaily.data?.focus_minutes ?? 0) + (input.session.focusMinutes ?? 0),
      actions,
    });
  }

  return mapSession(data);
}

export async function getStudyRecap(universeSlug: string): Promise<StudyRecapData | null> {
  const ctx = await getStudyContext(universeSlug);
  if (!ctx) return null;
  const { data } = await ctx.auth
    .from('study_sessions')
    .select('id, started_at, ended_at, duration_sec, focus_minutes, items, stats')
    .eq('universe_id', ctx.universe.id)
    .eq('user_id', ctx.session.userId)
    .order('started_at', { ascending: false })
    .limit(24);

  const sessions = (data ?? []).map((row) => ({ ...mapSession(row), universeSlug }));
  const active = sessions.find((session) => !session.endedAt) ?? null;
  const closed = sessions.filter((session) => session.endedAt);
  const latest = sessions[0] ?? null;
  const latestItem = latest?.items.slice().sort((a, b) => b.count - a.count)[0] ?? null;
  const continueItem = latestItem?.href
    ? {
        label: latestItem.label ?? 'Continuar estudo',
        href: latestItem.href,
      }
    : null;

  const candidates = await getRecommendationCandidates(universeSlug, ctx.universe.id);
  const recommendations = recommendStudyNext({ sessions: closed.length > 0 ? closed : sessions, ...candidates });

  return buildStudyRecapData({
    sessions: closed,
    activeSession: active,
    timeZone: 'America/Sao_Paulo',
    continueItem,
    recommendations,
  });
}

export async function getStudyWeekSummary(universeSlug: string) {
  const recap = await getStudyRecap(universeSlug);
  if (!recap || recap.week.activeDays === 0) return null;
  return recap.week;
}

export function buildGuestRecap(input: {
  universeSlug: string;
  sessions: StudySession[];
  activeSession?: StudySession | null;
  continueItem?: StudyRecapData['continueItem'];
  recommendations?: StudyRecapData['recommendations'];
}) {
  return buildStudyRecapData({
    sessions: input.sessions,
    activeSession: input.activeSession,
    timeZone: 'America/Sao_Paulo',
    continueItem: input.continueItem,
    recommendations: input.recommendations,
  });
}

