'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type TutorPointInput = {
  id: string;
  orderIndex: number;
  nodeSlug?: string | null;
  title?: string;
  goal?: string;
  requiredEvidenceIds: string[];
  guidedQuestions: string[];
  status?: 'todo' | 'done';
};

type LocalPointState = {
  openedEvidenceIds: string[];
  asked: boolean;
  done: boolean;
  lastThreadId?: string | null;
};

type UseTutorSessionInput = {
  slug: string;
  sessionId: string;
  mode: 'visitor' | 'logged';
  points: TutorPointInput[];
  currentIndex: number;
  onSetCurrentIndex?: (sessionId: string, index: number) => Promise<{ ok: boolean } | void>;
  onMarkDone?: (
    sessionId: string,
    orderIndex: number,
    options: { threadId?: string | null },
  ) => Promise<{ ok: boolean; done?: boolean; nextIndex?: number } | void>;
};

function storageKey(slug: string, sessionId: string) {
  return `cv:tutor-v1:${slug}:${sessionId}`;
}

function normalizeState(points: TutorPointInput[], raw: Record<string, LocalPointState> | null) {
  const out: Record<string, LocalPointState> = {};
  for (const point of points) {
    const current = raw?.[point.id];
    out[point.id] = {
      openedEvidenceIds: Array.from(new Set(current?.openedEvidenceIds ?? [])),
      asked: Boolean(current?.asked),
      done: point.status === 'done' || Boolean(current?.done),
      lastThreadId: current?.lastThreadId ?? null,
    };
  }
  return out;
}

function completionRule(point: TutorPointInput, state: LocalPointState) {
  const required = point.requiredEvidenceIds ?? [];
  let evidenceOk = true;
  if (required.length > 0) {
    const opened = required.filter((id) => state.openedEvidenceIds.includes(id)).length;
    evidenceOk = required.length <= 2 ? opened >= required.length : opened >= 2;
  }
  const questionOk = point.guidedQuestions.length > 0 ? state.asked : true;
  return { evidenceOk, questionOk, canComplete: evidenceOk && questionOk };
}

export function useTutorSession(input: UseTutorSessionInput) {
  const key = storageKey(input.slug, input.sessionId);
  const [currentIndex, setCurrentIndex] = useState(input.currentIndex);
  const [stateByPoint, setStateByPoint] = useState<Record<string, LocalPointState>>({});

  useEffect(() => {
    setCurrentIndex(input.currentIndex);
  }, [input.currentIndex, input.sessionId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as { currentIndex: number; points: Record<string, LocalPointState> }) : null;
      setStateByPoint(normalizeState(input.points, parsed?.points ?? null));
      if (input.mode === 'visitor' && typeof parsed?.currentIndex === 'number') {
        setCurrentIndex(Math.max(0, Math.min(parsed.currentIndex, Math.max(0, input.points.length - 1))));
      }
    } catch {
      setStateByPoint(normalizeState(input.points, null));
    }
  }, [input.mode, input.points, key]);

  useEffect(() => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          currentIndex,
          points: stateByPoint,
        }),
      );
    } catch {
      // noop
    }
  }, [currentIndex, key, stateByPoint]);

  const currentPoint = input.points[currentIndex] ?? null;

  const markEvidenceOpened = useCallback((pointId: string, evidenceId: string) => {
    setStateByPoint((current) => {
      const point = current[pointId] ?? { openedEvidenceIds: [], asked: false, done: false, lastThreadId: null };
      if (point.openedEvidenceIds.includes(evidenceId)) return current;
      return {
        ...current,
        [pointId]: {
          ...point,
          openedEvidenceIds: [...point.openedEvidenceIds, evidenceId],
        },
      };
    });
  }, []);

  const markAsked = useCallback((pointId: string, threadId?: string | null) => {
    setStateByPoint((current) => {
      const point = current[pointId] ?? { openedEvidenceIds: [], asked: false, done: false, lastThreadId: null };
      return {
        ...current,
        [pointId]: {
          ...point,
          asked: true,
          lastThreadId: threadId ?? point.lastThreadId ?? null,
        },
      };
    });
  }, []);

  const canCompletePoint = useCallback(
    (point: TutorPointInput) => {
      const state = stateByPoint[point.id] ?? { openedEvidenceIds: [], asked: false, done: false, lastThreadId: null };
      return completionRule(point, state);
    },
    [stateByPoint],
  );

  const setIndex = useCallback(
    async (nextIndex: number) => {
      const safe = Math.max(0, Math.min(nextIndex, Math.max(0, input.points.length - 1)));
      setCurrentIndex(safe);
      if (input.mode === 'logged' && input.onSetCurrentIndex) {
        try {
          await input.onSetCurrentIndex(input.sessionId, safe);
        } catch {
          // noop
        }
      }
    },
    [input.mode, input.onSetCurrentIndex, input.points.length, input.sessionId],
  );

  const completePoint = useCallback(
    async (point: TutorPointInput) => {
      const checks = canCompletePoint(point);
      if (!checks.canComplete) return { ok: false as const, reason: 'requirements_not_met' as const };
      const state = stateByPoint[point.id];
      const threadId = state?.lastThreadId ?? null;

      setStateByPoint((current) => ({
        ...current,
        [point.id]: {
          ...(current[point.id] ?? { openedEvidenceIds: [], asked: false, done: false, lastThreadId: null }),
          done: true,
        },
      }));

      if (input.mode === 'logged' && input.onMarkDone) {
        try {
          const result = await input.onMarkDone(input.sessionId, point.orderIndex, { threadId });
          if (result?.ok) {
            if (typeof result.nextIndex === 'number') setCurrentIndex(result.nextIndex);
            return { ok: true as const, doneSession: Boolean(result.done) };
          }
        } catch {
          // noop
        }
      } else {
        const next = Math.min(point.orderIndex + 1, Math.max(0, input.points.length - 1));
        setCurrentIndex(next);
      }

      return { ok: true as const, doneSession: false };
    },
    [canCompletePoint, input.mode, input.onMarkDone, input.points.length, input.sessionId, stateByPoint],
  );

  const completedCount = useMemo(
    () =>
      input.points.filter((point) => {
        const state = stateByPoint[point.id];
        return point.status === 'done' || Boolean(state?.done);
      }).length,
    [input.points, stateByPoint],
  );

  return {
    currentIndex,
    currentPoint,
    stateByPoint,
    completedCount,
    total: input.points.length,
    setIndex,
    markEvidenceOpened,
    markAsked,
    canCompletePoint,
    completePoint,
  };
}
