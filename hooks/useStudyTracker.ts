'use client';

import { createContext, useContext } from 'react';
import type { StudyTrackerEvent } from '@/lib/study/types';

export type StudyTrackerContextValue = {
  trackAction: (event: StudyTrackerEvent) => void;
  endSession: () => void;
};

export const StudyTrackerContext = createContext<StudyTrackerContextValue>({
  trackAction: () => {},
  endSession: () => {},
});

export function useStudyTracker() {
  return useContext(StudyTrackerContext);
}
