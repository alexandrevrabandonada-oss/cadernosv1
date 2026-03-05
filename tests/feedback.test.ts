import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canVibrate, feedback, playCue, vibrate } from '@/lib/feedback/feedback';

describe('feedback engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('nao quebra fora do browser', () => {
    expect(canVibrate()).toBe(false);
    expect(() => vibrate('tap')).not.toThrow();
    expect(() => playCue('success')).not.toThrow();
    expect(() => feedback('warning', { haptics: true, sound_cues: true })).not.toThrow();
  });

  it('executa vibrate quando API existe', () => {
    const spy = vi.fn();
    vi.stubGlobal('window', { AudioContext: undefined });
    vi.stubGlobal('navigator', { vibrate: spy });
    expect(canVibrate()).toBe(true);
    feedback('tap', { haptics: true, sound_cues: false });
    expect(spy).toHaveBeenCalled();
  });
});

