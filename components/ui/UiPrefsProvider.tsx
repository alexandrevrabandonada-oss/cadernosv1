'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useUiPrefs } from '@/hooks/useUiPrefs';
import type { UiDensity, UiSection, UiSettings, UiTexture } from '@/lib/user/uiSettings';

type UiPrefsContextValue = {
  isLoggedIn: boolean;
  settings: UiSettings;
  setDensity: (value: UiDensity) => void;
  setTexture: (value: UiTexture) => void;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
  setHaptics: (value: boolean) => void;
  setSoundCues: (value: boolean) => void;
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
  return <UiPrefsContext.Provider value={{ ...prefs, isLoggedIn }}>{children}</UiPrefsContext.Provider>;
}

export function useUiPrefsContext() {
  return useContext(UiPrefsContext);
}
