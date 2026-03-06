import type { UiSection } from '@/lib/user/uiSettings';

export type StudyAction =
  | 'focus_mode'
  | 'doc_open'
  | 'evidence_view'
  | 'thread_view'
  | 'event_view'
  | 'trail_step_open'
  | 'trail_step_done'
  | 'tutor_point_open'
  | 'tutor_ask'
  | 'highlight_created'
  | 'note_created'
  | 'export_clip'
  | 'export_notebook';

export type StudyItemType =
  | 'doc'
  | 'evidence'
  | 'thread'
  | 'event'
  | 'trail'
  | 'tutor'
  | 'highlight'
  | 'note'
  | 'node'
  | 'section';

export type StudySessionItem = {
  type: StudyItemType;
  id: string;
  action: StudyAction;
  count: number;
  label?: string | null;
  href?: string | null;
  nodeSlug?: string | null;
  tags?: string[];
};

export type StudySession = {
  id: string;
  universeSlug: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  focusMinutes: number | null;
  items: StudySessionItem[];
  stats: Record<string, number>;
  lastSection?: UiSection;
};

export type StudyDaily = {
  day: string;
  focusMinutes: number;
  actions: Record<string, number>;
};

export type StudyTrackerEvent = {
  action: StudyAction;
  item?: {
    type: StudyItemType;
    id: string;
    label?: string | null;
    href?: string | null;
    nodeSlug?: string | null;
    tags?: string[];
  } | null;
  lastSection?: UiSection;
};

export type StudyRecapCard = {
  focusMinutes: number;
  itemsStudied: number;
  highlights: number;
  notes: number;
  topActions: Array<{ key: string; count: number }>;
};

export type StudyRecapData = {
  today: StudyRecapCard & { day: string };
  week: StudyRecapCard & { activeDays: number };
  sessions: StudySession[];
  continueItem: {
    label: string;
    href: string;
    section?: UiSection;
  } | null;
  recommendations: {
    nodes: Array<{ id: string; slug: string; title: string; summary?: string | null }>;
    evidences: Array<{ id: string; title: string; summary?: string | null; href: string; nodeSlug?: string | null }>;
  };
};
