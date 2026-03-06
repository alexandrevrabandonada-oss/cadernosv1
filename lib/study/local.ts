'use client';

import { buildStudyDaily } from '@/lib/study/aggregate';
import type { StudySession } from '@/lib/study/types';

function key(kind: 'active' | 'sessions', universeSlug: string) {
  return `cv:study:${kind}:v1:${universeSlug}`;
}

function readJson<T>(storageKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readActiveStudySession(universeSlug: string) {
  return readJson<StudySession | null>(key('active', universeSlug), null);
}

export function writeActiveStudySession(universeSlug: string, session: StudySession | null) {
  try {
    if (!session) {
      localStorage.removeItem(key('active', universeSlug));
      return;
    }
    localStorage.setItem(key('active', universeSlug), JSON.stringify(session));
  } catch {}
}

export function readStudySessions(universeSlug: string) {
  return readJson<StudySession[]>(key('sessions', universeSlug), []);
}

export function appendStudySession(universeSlug: string, session: StudySession) {
  const current = readStudySessions(universeSlug).filter((item) => item.id !== session.id);
  try {
    localStorage.setItem(key('sessions', universeSlug), JSON.stringify([session, ...current].slice(0, 90)));
  } catch {}
}

export function readStudyDaily(universeSlug: string, timeZone?: string) {
  return buildStudyDaily(readStudySessions(universeSlug), timeZone);
}
