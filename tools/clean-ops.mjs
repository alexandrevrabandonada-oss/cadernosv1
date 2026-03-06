import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const removableDirs = ['test-results', 'playwright-report'];
const removableFilePatterns = [
  /\.tsbuildinfo$/i,
  /\.err\.log$/i,
  /\.out\.log$/i,
  /^e2e-.*\.log$/i,
  /^playwright-.*\.log$/i,
  /^pw-.*\.log$/i,
  /^test-e2e-.*\.log$/i,
  /^test-ui-.*\.log$/i,
  /^verify-.*\.log$/i,
];

for (const dir of removableDirs) {
  await rm(join(root, dir), { recursive: true, force: true });
}

const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile()) continue;
  if (!removableFilePatterns.some((pattern) => pattern.test(entry.name))) continue;
  await rm(join(root, entry.name), { force: true });
}

console.log('[clean:ops] Artefatos operacionais temporarios removidos.');
