'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { StudyTrackerContext } from '@/hooks/useStudyTracker';
import { applyStudyEvent, createEmptySession, finalizeStudySession } from '@/lib/study/aggregate';
import { appendStudySession, readActiveStudySession, writeActiveStudySession } from '@/lib/study/local';
import type { StudySession, StudyTrackerEvent } from '@/lib/study/types';

const IDLE_MS = 5 * 60 * 1000;
const FLUSH_MS = 1500;
const FOCUS_TICK_MS = 30 * 1000;

function buildRouteEvent(pathname: string, searchParams: URLSearchParams, lastSection?: StudyTrackerEvent['lastSection']): StudyTrackerEvent | null {
  if (pathname.includes('/doc/')) {
    const docId = pathname.split('/doc/')[1]?.split('/')[0] ?? '';
    if (!docId) return null;
    const page = searchParams.get('p');
    return {
      action: 'doc_open',
      item: {
        type: 'doc',
        id: docId,
        label: `Doc ${docId}`,
        href: `${pathname}${page ? `?p=${page}` : ''}`,
      },
      lastSection,
    };
  }
  if (pathname.endsWith('/provas')) {
    const selected = searchParams.get('selected');
    if (!selected) return null;
    return {
      action: 'evidence_view',
      item: { type: 'evidence', id: selected, label: `Evidencia ${selected}`, href: `${pathname}?selected=${selected}&panel=detail` },
      lastSection,
    };
  }
  if (pathname.endsWith('/debate')) {
    const selected = searchParams.get('selected');
    if (!selected) return null;
    return {
      action: 'thread_view',
      item: { type: 'thread', id: selected, label: `Thread ${selected}`, href: `${pathname}?selected=${selected}&panel=detail` },
      lastSection,
    };
  }
  if (pathname.endsWith('/linha')) {
    const selected = searchParams.get('selected');
    if (!selected) return null;
    return {
      action: 'event_view',
      item: { type: 'event', id: selected, label: `Evento ${selected}`, href: `${pathname}?selected=${selected}&panel=detail` },
      lastSection,
    };
  }
  return null;
}

function shouldCountFocus(pathname: string, focusMode: boolean) {
  return focusMode || pathname.includes('/doc/') || pathname.includes('/tutor') || pathname.includes('/trilhas');
}

export function StudyTrackerProvider({ universeSlug, children }: { universeSlug: string; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const uiPrefs = useUiPrefsContext();
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const lastActiveRef = useRef(Date.now());
  const focusSecondsRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeSignature = `${pathname}?${searchParams.toString()}`;
  const routeEvent = useMemo(
    () => buildRouteEvent(pathname, new URLSearchParams(searchParams.toString()), uiPrefs?.settings.last_section),
    [pathname, searchParams, uiPrefs?.settings.last_section],
  );

  const persistRemote = useCallback(
    (session: StudySession) => {
      if (!uiPrefs?.isLoggedIn) return;
      fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universeSlug,
          session,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      }).catch(() => {});
    },
    [uiPrefs?.isLoggedIn, universeSlug],
  );

  const scheduleFlush = useCallback(
    (session: StudySession) => {
      writeActiveStudySession(universeSlug, session);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => persistRemote(session), FLUSH_MS);
    },
    [persistRemote, universeSlug],
  );

  const ensureSession = useCallback(
    (event?: StudyTrackerEvent | null) => {
      setActiveSession((current) => {
        const base = current ?? readActiveStudySession(universeSlug) ?? createEmptySession(universeSlug, crypto.randomUUID(), uiPrefs?.settings.last_section);
        const next = event ? applyStudyEvent(base, event) : base;
        scheduleFlush(next);
        return next;
      });
    },
    [scheduleFlush, uiPrefs?.settings.last_section, universeSlug],
  );

  const endSession = useCallback(() => {
    setActiveSession((current) => {
      const base = current ?? readActiveStudySession(universeSlug);
      if (!base) return null;
      const finished = finalizeStudySession(base, { focusSeconds: focusSecondsRef.current });
      appendStudySession(universeSlug, finished);
      writeActiveStudySession(universeSlug, null);
      persistRemote(finished);
      focusSecondsRef.current = 0;
      return null;
    });
  }, [persistRemote, universeSlug]);

  const trackAction = useCallback(
    (event: StudyTrackerEvent) => {
      lastActiveRef.current = Date.now();
      ensureSession(event);
    },
    [ensureSession],
  );

  useEffect(() => {
    const stored = readActiveStudySession(universeSlug);
    if (stored) setActiveSession(stored);
  }, [universeSlug]);

  useEffect(() => {
    if (routeEvent) {
      lastActiveRef.current = Date.now();
      ensureSession(routeEvent);
    }
  }, [ensureSession, routeEvent, routeSignature]);

  useEffect(() => {
    if (!uiPrefs?.settings.focus_mode) return;
    trackAction({ action: 'focus_mode', lastSection: uiPrefs.settings.last_section });
  }, [trackAction, uiPrefs?.settings.focus_mode, uiPrefs?.settings.last_section]);

  useEffect(() => {
    const onActivity = () => {
      lastActiveRef.current = Date.now();
    };
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    return () => {
      events.forEach((name) => window.removeEventListener(name, onActivity));
    };
  }, []);

  useEffect(() => {
    const idleTimer = window.setInterval(() => {
      if (!activeSession) return;
      if (Date.now() - lastActiveRef.current > IDLE_MS) endSession();
    }, 20_000);
    const focusTimer = window.setInterval(() => {
      if (!activeSession || document.hidden) return;
      if (shouldCountFocus(pathname, Boolean(uiPrefs?.settings.focus_mode))) {
        focusSecondsRef.current += FOCUS_TICK_MS / 1000;
      }
    }, FOCUS_TICK_MS);
    return () => {
      window.clearInterval(idleTimer);
      window.clearInterval(focusTimer);
    };
  }, [activeSession, endSession, pathname, uiPrefs?.settings.focus_mode]);

  useEffect(() => {
    const onPageHide = () => endSession();
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [endSession]);

  return <StudyTrackerContext.Provider value={{ trackAction, endSession }}>{children}</StudyTrackerContext.Provider>;
}
