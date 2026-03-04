import { ingestConfig, type IngestChunkConfig } from '@/lib/ingest/config';

export type IngestPresetName =
  | 'default'
  | 'aggressive_dedupe'
  | 'no_dedupe'
  | 'short_chunks'
  | 'long_chunks';

export type IngestPreset = {
  name: IngestPresetName;
  dedupeMode: 'normal' | 'aggressive' | 'none';
  chunk: IngestChunkConfig;
};

const PRESETS: Record<IngestPresetName, IngestPreset> = {
  default: {
    name: 'default',
    dedupeMode: 'normal',
    chunk: {
      chunk_size: ingestConfig.chunk_size,
      overlap: ingestConfig.overlap,
    },
  },
  aggressive_dedupe: {
    name: 'aggressive_dedupe',
    dedupeMode: 'aggressive',
    chunk: {
      chunk_size: ingestConfig.chunk_size,
      overlap: ingestConfig.overlap,
    },
  },
  no_dedupe: {
    name: 'no_dedupe',
    dedupeMode: 'none',
    chunk: {
      chunk_size: ingestConfig.chunk_size,
      overlap: ingestConfig.overlap,
    },
  },
  short_chunks: {
    name: 'short_chunks',
    dedupeMode: 'normal',
    chunk: {
      chunk_size: 700,
      overlap: 140,
    },
  },
  long_chunks: {
    name: 'long_chunks',
    dedupeMode: 'normal',
    chunk: {
      chunk_size: 1900,
      overlap: 260,
    },
  },
};

export function isIngestPreset(value: unknown): value is IngestPresetName {
  return typeof value === 'string' && value in PRESETS;
}

export function resolveIngestPreset(value: unknown): IngestPreset {
  if (isIngestPreset(value)) return PRESETS[value];
  return PRESETS.default;
}

export const ingestPresetOptions = Object.keys(PRESETS) as IngestPresetName[];
