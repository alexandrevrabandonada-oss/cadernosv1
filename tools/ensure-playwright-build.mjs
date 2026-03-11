import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const buildMarkers = [
  join(process.cwd(), '.next', 'routes-manifest.json'),
  join(process.cwd(), '.next', 'BUILD_ID'),
];

async function hasBuildOutput() {
  try {
    await Promise.all(buildMarkers.map((file) => access(file, constants.F_OK)));
    return true;
  } catch {
    return false;
  }
}

async function runBuild() {
  console.log('[playwright-build] Build ausente ou incompleto. Executando `npm run build` antes da suite.');
  await new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'];
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        CI: process.env.CI ?? '1',
        NODE_ENV: 'production',
      },
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`build interrompido por ${signal}`));
        return;
      }
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`npm run build falhou com codigo ${code ?? 1}`));
    });
  });
}

export async function ensurePlaywrightBuild() {
  if (await hasBuildOutput()) {
    console.log('[playwright-build] Reutilizando build existente em .next/.');
    return;
  }

  await runBuild();
}
