import type { StudyRecapCard, StudyRecapData, StudySession, StudySessionItem, StudyTrackerEvent } from '@/lib/study/types';
import type { UiSection } from '@/lib/user/uiSettings';

const ACTIVE_DAYS_WINDOW = 7;

function safeDate(value: string | null | undefined) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function roundMinutes(seconds: number) {
  return Math.max(0, Math.round(seconds / 60));
}

function getDayKey(iso: string, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function mergeStats(base: Record<string, number>, patch: Record<string, number>) {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    next[key] = (next[key] ?? 0) + value;
  }
  return next;
}

function upsertItem(items: StudySessionItem[], event: StudyTrackerEvent) {
  if (!event.item) return items;
  const key = `${event.item.type}:${event.item.id}:${event.action}`;
  let found = false;
  const next = items.map((item) => {
    const currentKey = `${item.type}:${item.id}:${item.action}`;
    if (currentKey !== key) return item;
    found = true;
    return {
      ...item,
      count: item.count + 1,
      label: event.item?.label ?? item.label ?? null,
      href: event.item?.href ?? item.href ?? null,
      nodeSlug: event.item?.nodeSlug ?? item.nodeSlug ?? null,
      tags: event.item?.tags && event.item.tags.length > 0 ? event.item.tags : item.tags ?? [],
    };
  });
  if (found) return next;
  return [
    ...next,
    {
      type: event.item.type,
      id: event.item.id,
      action: event.action,
      count: 1,
      label: event.item.label ?? null,
      href: event.item.href ?? null,
      nodeSlug: event.item.nodeSlug ?? null,
      tags: event.item.tags ?? [],
    },
  ];
}

function eventStats(event: StudyTrackerEvent) {
  const stats: Record<string, number> = { [event.action]: 1 };
  if (event.item) stats[event.item.type] = (stats[event.item.type] ?? 0) + 1;
  if (event.action === 'highlight_created') stats.highlights = 1;
  if (event.action === 'note_created') stats.notes = 1;
  return stats;
}

export function createEmptySession(universeSlug: string, sessionId: string, lastSection?: UiSection): StudySession {
  return {
    id: sessionId,
    universeSlug,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSec: 0,
    focusMinutes: 0,
    items: [],
    stats: {},
    lastSection,
  };
}

export function applyStudyEvent(session: StudySession, event: StudyTrackerEvent) {
  return {
    ...session,
    lastSection: event.lastSection ?? session.lastSection,
    items: upsertItem(session.items, event),
    stats: mergeStats(session.stats, eventStats(event)),
  };
}

export function finalizeStudySession(session: StudySession, input: { endedAt?: string; focusSeconds?: number }) {
  const endedAt = input.endedAt ?? new Date().toISOString();
  const start = safeDate(session.startedAt);
  const end = safeDate(endedAt);
  const durationSec = start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)) : session.durationSec ?? 0;
  return {
    ...session,
    endedAt,
    durationSec,
    focusMinutes: roundMinutes(input.focusSeconds ?? 0),
  };
}

function summarizeCard(sessions: StudySession[]) {
  const stats = sessions.reduce(
    (acc, session) => {
      acc.focusMinutes += session.focusMinutes ?? 0;
      acc.highlights += session.stats.highlights ?? session.stats.highlight_created ?? 0;
      acc.notes += session.stats.notes ?? session.stats.note_created ?? 0;
      for (const item of session.items) {
        if (item.id && ['doc', 'evidence', 'thread', 'event'].includes(item.type)) acc.uniqueItems.add(`${item.type}:${item.id}`);
      }
      for (const [key, value] of Object.entries(session.stats)) {
        if (!key.endsWith('_created') && !['doc', 'evidence', 'thread', 'event', 'highlight', 'note', 'highlights', 'notes'].includes(key)) {
          acc.actions[key] = (acc.actions[key] ?? 0) + value;
        }
      }
      return acc;
    },
    {
      focusMinutes: 0,
      highlights: 0,
      notes: 0,
      uniqueItems: new Set<string>(),
      actions: {} as Record<string, number>,
    },
  );

  const topActions = Object.entries(stats.actions)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([key, count]) => ({ key, count }));

  const card: StudyRecapCard = {
    focusMinutes: stats.focusMinutes,
    itemsStudied: stats.uniqueItems.size,
    highlights: stats.highlights,
    notes: stats.notes,
    topActions,
  };

  return card;
}

export function buildStudyDaily(sessions: StudySession[], timeZone = 'UTC') {
  const map = new Map<string, { day: string; focusMinutes: number; actions: Record<string, number> }>();
  for (const session of sessions) {
    const key = getDayKey(session.endedAt ?? session.startedAt, timeZone);
    const current = map.get(key) ?? { day: key, focusMinutes: 0, actions: {} };
    current.focusMinutes += session.focusMinutes ?? 0;
    for (const [action, count] of Object.entries(session.stats)) {
      if (!count) continue;
      current.actions[action] = (current.actions[action] ?? 0) + count;
    }
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => b.day.localeCompare(a.day));
}

export function buildStudyRecapData(input: {
  sessions: StudySession[];
  activeSession?: StudySession | null;
  timeZone?: string;
  continueItem?: StudyRecapData['continueItem'];
  recommendations?: StudyRecapData['recommendations'];
}): StudyRecapData {
  const timeZone = input.timeZone ?? 'UTC';
  const sessions = [...input.sessions];
  if (input.activeSession) {
    const active = finalizeStudySession(input.activeSession, {
      endedAt: new Date().toISOString(),
      focusSeconds: (input.activeSession.focusMinutes ?? 0) * 60,
    });
    sessions.unshift(active);
  }

  const todayKey = getDayKey(new Date().toISOString(), timeZone);
  const todaySessions = sessions.filter((session) => getDayKey(session.endedAt ?? session.startedAt, timeZone) === todayKey);
  const recentDaily = buildStudyDaily(sessions, timeZone).slice(0, ACTIVE_DAYS_WINDOW);
  const weekDays = new Set(recentDaily.map((item) => item.day));
  const weekStart = Date.now() - ACTIVE_DAYS_WINDOW * 24 * 60 * 60 * 1000;
  const weekSessions = sessions.filter((session) => {
    const startedAt = safeDate(session.startedAt);
    return startedAt ? startedAt.getTime() >= weekStart : false;
  });

  return {
    today: {
      day: todayKey,
      ...summarizeCard(todaySessions),
    },
    week: {
      activeDays: weekDays.size,
      ...summarizeCard(weekSessions),
    },
    sessions: sessions.slice().sort((a, b) => (b.startedAt < a.startedAt ? -1 : 1)).slice(0, 10),
    continueItem: input.continueItem ?? null,
    recommendations: input.recommendations ?? { nodes: [], evidences: [] },
  };
}
