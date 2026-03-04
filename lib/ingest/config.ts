export const ingestConfig = {
  chunk_size: 900,
  overlap: 180,
};

export type IngestChunkConfig = {
  chunk_size: number;
  overlap: number;
};
