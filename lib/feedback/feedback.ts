'use client';

import type { UiSettings } from '@/lib/user/uiSettings';

type FeedbackType = 'tap' | 'success' | 'warning';

const PATTERNS: Record<FeedbackType, number | number[]> = {
  tap: 10,
  success: [10, 30, 12],
  warning: [18, 40, 18],
};

function hasWindow() {
  return typeof window !== 'undefined';
}

export function canVibrate() {
  return hasWindow() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function vibrate(type: FeedbackType = 'tap') {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(PATTERNS[type]);
  } catch {
    // noop
  }
}

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!hasWindow()) return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function playCue(type: FeedbackType = 'tap') {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = type === 'warning' ? 240 : type === 'success' ? 680 : 520;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  } catch {
    // noop
  }
}

export function feedback(type: FeedbackType, settings?: Pick<UiSettings, 'haptics' | 'sound_cues'> | null) {
  if (!hasWindow()) return;
  if (settings?.haptics) vibrate(type);
  if (settings?.sound_cues) playCue(type);
}

