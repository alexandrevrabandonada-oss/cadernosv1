export type UiDensity = 'normal' | 'compact';
export type UiTexture = 'normal' | 'low';
export type UiSection = 'mapa' | 'provas' | 'linha' | 'debate' | 'glossario' | 'trilhas' | 'tutor';

export type UiSettings = {
  density: UiDensity;
  texture: UiTexture;
  focus_mode: boolean;
  haptics: boolean;
  sound_cues: boolean;
  last_section?: UiSection;
};

export const DEFAULT_UI_SETTINGS: UiSettings = {
  density: 'normal',
  texture: 'normal',
  focus_mode: false,
  haptics: false,
  sound_cues: false,
};

function sanitizeDensity(value: unknown): UiDensity {
  return value === 'compact' ? 'compact' : 'normal';
}

function sanitizeTexture(value: unknown): UiTexture {
  return value === 'low' ? 'low' : 'normal';
}

function sanitizeLastSection(value: unknown): UiSection | undefined {
  const valid: UiSection[] = ['mapa', 'provas', 'linha', 'debate', 'glossario', 'trilhas', 'tutor'];
  if (typeof value !== 'string') return undefined;
  return valid.includes(value as UiSection) ? (value as UiSection) : undefined;
}

function sanitizeFocusMode(value: unknown) {
  return value === true;
}

function sanitizeBool(value: unknown) {
  return value === true;
}

export function normalizeUiSettings(value: unknown): UiSettings {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const normalized: UiSettings = {
    density: sanitizeDensity(source.density),
    texture: sanitizeTexture(source.texture),
    focus_mode: sanitizeFocusMode(source.focus_mode),
    haptics: sanitizeBool(source.haptics),
    sound_cues: sanitizeBool(source.sound_cues),
  };
  const lastSection = sanitizeLastSection(source.last_section);
  if (lastSection) normalized.last_section = lastSection;
  return normalized;
}
