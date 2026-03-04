'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useUiPrefs } from '@/hooks/useUiPrefs';
import type { UiDensity, UiSection, UiSettings, UiTexture } from '@/lib/user/uiSettings';

type UiPrefsContextValue = {
  settings: UiSettings;
  setDensity: (value: UiDensity) => void;
  setTexture: (value: UiTexture) => void;
  setLastSection: (value: UiSection) => void;
};

const UiPrefsContext = createContext<UiPrefsContextValue | null>(null);

type UiPrefsProviderProps = {
  children: ReactNode;
  initialSettings: UiSettings;
  isLoggedIn: boolean;
};

export function UiPrefsProvider({ children, initialSettings, isLoggedIn }: UiPrefsProviderProps) {
  const prefs = useUiPrefs({ initial: initialSettings, isLoggedIn });
  return <UiPrefsContext.Provider value={prefs}>{children}</UiPrefsContext.Provider>;
}

export function useUiPrefsContext() {
  return useContext(UiPrefsContext);
}
