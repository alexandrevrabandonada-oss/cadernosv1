export type UiDensity = 'normal' | 'compact';
export type UiTexture = 'normal' | 'low';
export type UiSection = 'mapa' | 'provas' | 'linha' | 'debate' | 'glossario' | 'trilhas' | 'tutor';

export type UiSettings = {
  density: UiDensity;
  texture: UiTexture;
  last_section?: UiSection;
};

export const DEFAULT_UI_SETTINGS: UiSettings = {
  density: 'normal',
  texture: 'normal',
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

export function normalizeUiSettings(value: unknown): UiSettings {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const normalized: UiSettings = {
    density: sanitizeDensity(source.density),
    texture: sanitizeTexture(source.texture),
  };
  const lastSection = sanitizeLastSection(source.last_section);
  if (lastSection) normalized.last_section = lastSection;
  return normalized;
}

