'use client';

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

type WorkspaceActions = {
  closeDetail: () => void;
  closeFilters: () => void;
};

type WorkspaceContextValue = {
  registerActions: (actions: WorkspaceActions | null) => void;
  closePanels: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const actionsRef = useRef<WorkspaceActions | null>(null);

  const registerActions = useCallback((next: WorkspaceActions | null) => {
    actionsRef.current = next;
  }, []);

  const closePanels = useCallback(() => {
    actionsRef.current?.closeDetail();
    actionsRef.current?.closeFilters();
  }, []);

  const value = useMemo(
    () => ({
      registerActions,
      closePanels,
    }),
    [closePanels, registerActions],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
