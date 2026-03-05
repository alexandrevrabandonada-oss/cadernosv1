'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { UiDensity, UiSection, UiSettings, UiTexture } from '@/lib/user/uiSettings';

type UseUiPrefsInput = {
  initial: UiSettings;
  isLoggedIn: boolean;
};

const STORAGE_KEY = 'cv:ui-prefs';

function readLocal(): Partial<UiSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<UiSettings>;
  } catch {
    return {};
  }
}

function writeLocal(settings: UiSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function applyAttrs(settings: UiSettings) {
  const snapshotQuery =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('snapshot') === '1';
  const motionOff = document.documentElement.getAttribute('data-motion') === 'off';
  const forceOff = motionOff || snapshotQuery;
  document.documentElement.setAttribute('data-density', settings.density);
  document.documentElement.setAttribute('data-texture', settings.texture);
  document.documentElement.setAttribute('data-focus', !forceOff && settings.focus_mode ? 'on' : 'off');
}

export function useUiPrefs({ initial, isLoggedIn }: UseUiPrefsInput) {
  const [settings, setSettings] = useState<UiSettings>(initial);
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const local = readLocal();
    const next = isLoggedIn
      ? initial
      : {
          ...initial,
          ...local,
        };
    setSettings(next);
    applyAttrs(next);
    initializedRef.current = true;
  }, [initial, isLoggedIn]);

  useEffect(() => {
    if (!initializedRef.current) return;
    applyAttrs(settings);
    writeLocal(settings);
  }, [settings]);

  useEffect(() => {
    if (!initializedRef.current || !isLoggedIn) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/user/ui-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }).catch(() => {});
    }, 320);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isLoggedIn, settings]);

  const api = useMemo(
    () => ({
      settings,
      setDensity: (density: UiDensity) => setSettings((prev) => ({ ...prev, density })),
      setTexture: (texture: UiTexture) => setSettings((prev) => ({ ...prev, texture })),
      setFocusMode: (focus_mode: boolean) => setSettings((prev) => ({ ...prev, focus_mode })),
      toggleFocusMode: () => setSettings((prev) => ({ ...prev, focus_mode: !prev.focus_mode })),
      setHaptics: (haptics: boolean) => setSettings((prev) => ({ ...prev, haptics })),
      setSoundCues: (sound_cues: boolean) => setSettings((prev) => ({ ...prev, sound_cues })),
      setLastSection: (last_section: UiSection) => setSettings((prev) => ({ ...prev, last_section })),
    }),
    [settings],
  );

  return api;
}
