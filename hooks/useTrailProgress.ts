'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type MarkStepFn = (input: { universeId: string; trailId: string; stepId: string }) => Promise<{ ok: boolean } | void>;

type UseTrailProgressInput = {
  universeSlug: string;
  universeId: string | null;
  trailId: string;
  stepIds: string[];
  initialDoneStepIds?: string[];
  isLoggedIn: boolean;
  persistStepDone?: MarkStepFn;
};

function localKey(universeSlug: string, trailId: string) {
  return `cv:trail-progress:${universeSlug}:${trailId}`;
}

export function useTrailProgress(input: UseTrailProgressInput) {
  const key = localKey(input.universeSlug, input.trailId);
  const initialSet = useMemo(() => new Set(input.initialDoneStepIds ?? []), [input.initialDoneStepIds]);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const local = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      const merged: Record<string, boolean> = {};
      for (const stepId of input.stepIds) {
        merged[stepId] = Boolean(local[stepId] || initialSet.has(stepId));
      }
      setDone(merged);
    } catch {
      const fallback: Record<string, boolean> = {};
      for (const stepId of input.stepIds) {
        fallback[stepId] = initialSet.has(stepId);
      }
      setDone(fallback);
    }
  }, [key, input.stepIds, initialSet]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(done));
    } catch {
      // noop
    }
  }, [done, key]);

  const getStepStatus = useCallback(
    (stepId: string) => (done[stepId] ? ('done' as const) : ('todo' as const)),
    [done],
  );

  const markDone = useCallback(
    async (stepId: string) => {
      setDone((current) => ({ ...current, [stepId]: true }));
      if (input.isLoggedIn && input.universeId && input.persistStepDone) {
        try {
          await input.persistStepDone({
            universeId: input.universeId,
            trailId: input.trailId,
            stepId,
          });
        } catch {
          // best effort
        }
      }
    },
    [input.isLoggedIn, input.persistStepDone, input.trailId, input.universeId],
  );

  const resetTrail = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
    const fresh: Record<string, boolean> = {};
    for (const stepId of input.stepIds) {
      fresh[stepId] = false;
    }
    setDone(fresh);
  }, [input.stepIds, key]);

  const completedCount = useMemo(
    () => input.stepIds.filter((stepId) => Boolean(done[stepId])).length,
    [done, input.stepIds],
  );

  return {
    done,
    completedCount,
    total: input.stepIds.length,
    getStepStatus,
    markDone,
    resetTrail,
  };
}
