#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.vercel',
]);

const IGNORE_PATH_PREFIXES = ['supabase/.temp/', 'supabase/.temp\\'];

const REPORTS_PREFIX = `reports${path.sep}`;

const forbiddenVersionedFileRe = /(^|[\\/])\.env($|[.][^\\/]+$)/i;

const patterns = [
  {
    name: 'supabase_service_role_key',
    re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[A-Za-z0-9._-]{20,}/,
  },
  {
    name: 'supabase_access_token',
    re: /SUPABASE_ACCESS_TOKEN\s*=\s*[^\s'"]{20,}/,
  },
  {
    name: 'upstash_token',
    re: /UPSTASH_REDIS_REST_TOKEN\s*=\s*[^\s'"]{20,}/,
  },
  {
    name: 'vercel_token',
    re: /VERCEL_TOKEN\s*=\s*[^\s'"]{20,}/,
  },
  {
    name: 'sentry_auth_token',
    re: /SENTRY_AUTH_TOKEN\s*=\s*[^\s'"]{20,}/,
  },
  {
    name: 'private_key_block',
    re: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
  },
  {
    name: 'jwt_like_token',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    name: 'url_with_embedded_credentials',
    re: /\bhttps?:\/\/[^/\s:@]+:[^/\s@]+@/i,
  },
];

const reportObviousPatterns = [
  { name: 'explicit_service_role_name', re: /SUPABASE_SERVICE_ROLE_KEY\s*=/ },
  { name: 'explicit_upstash_token_name', re: /UPSTASH_REDIS_REST_TOKEN\s*=/ },
  { name: 'explicit_vercel_token_name', re: /VERCEL_TOKEN\s*=/ },
  { name: 'explicit_sentry_auth_token_name', re: /SENTRY_AUTH_TOKEN\s*=/ },
  { name: 'private_key_block', re: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/ },
  { name: 'jwt_like_token', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
];

function run(cmd) {
  return execSync(cmd, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function getTrackedFiles() {
  const out = run('git ls-files');
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getCandidateFiles() {
  const out = run('git ls-files -co --exclude-standard');
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function shouldIgnore(filePath) {
  if (filePath === 'tools/secrets-check.mjs') return true;
  for (const prefix of IGNORE_PATH_PREFIXES) {
    if (filePath.startsWith(prefix)) return true;
  }

  const parts = filePath.split(/[\\/]/);
  for (const part of parts) {
    if (IGNORE_DIRS.has(part)) return true;
  }
  return false;
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const binaryExt = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.pdf',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.zip',
    '.gz',
    '.tar',
    '.7z',
    '.mp4',
    '.mp3',
    '.mov',
    '.avi',
    '.bin',
  ]);
  return !binaryExt.has(ext);
}

function addFinding(findings, file, line, rule, message) {
  findings.push({ file, line, rule, message });
}

function scanFile(filePath, findings) {
  const abs = path.resolve(repoRoot, filePath);
  if (!fs.existsSync(abs)) return;
  if (!fs.statSync(abs).isFile()) return;
  if (!isTextFile(filePath)) return;

  let content = '';
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch {
    return;
  }

  const isReport = filePath.startsWith(REPORTS_PREFIX) || filePath.startsWith('reports/');
  const isEnvExample = filePath === '.env.example' || filePath.endsWith('/.env.example');
  let activePatterns = isReport ? reportObviousPatterns : patterns;
  if (isEnvExample) {
    activePatterns = activePatterns.filter((item) =>
      ['private_key_block', 'jwt_like_token', 'url_with_embedded_credentials'].includes(item.name),
    );
  }
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of activePatterns) {
      const match = line.match(pattern.re);
      if (!match) continue;
      if (pattern.name === 'url_with_embedded_credentials' && /:\*{3}@/.test(match[0])) {
        continue;
      }
      if (match) {
        addFinding(findings, filePath, i + 1, pattern.name, 'possible secret pattern');
      }
    }
  }
}

function main() {
  const tracked = getTrackedFiles();
  const candidates = getCandidateFiles();
  const findings = [];

  for (const file of tracked) {
    if (forbiddenVersionedFileRe.test(file) && !/\.env\.example$/i.test(file)) {
      addFinding(findings, file, 1, 'forbidden_env_file_versioned', 'forbidden .env-like file tracked');
    }
  }

  for (const file of candidates) {
    if (shouldIgnore(file)) continue;
    scanFile(file, findings);
  }

  if (findings.length > 0) {
    console.error('Secrets check failed. Potential sensitive data found:');
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
    }
    console.error(
      'Fix: remove/redact secret values, keep placeholders in .env.example, and rotate leaked credentials immediately.',
    );
    process.exit(1);
  }

  console.log('Secrets check passed. No blocked patterns found.');
}

main();
