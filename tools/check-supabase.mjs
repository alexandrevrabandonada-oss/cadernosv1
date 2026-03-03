import fs from 'node:fs';
import path from 'node:path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function mask(value) {
  if (!value) return '(missing)';
  if (value.length <= 10) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function checkKey(url, key, label) {
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !serviceRole) {
    console.error('Missing required env vars:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
    console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`URL: ${url}`);
  console.log(`ANON: ${mask(anon)}`);
  console.log(`SERVICE_ROLE: ${mask(serviceRole)}`);

  await checkKey(url, anon, 'anon key');
  await checkKey(url, serviceRole, 'service role key');

  console.log('Supabase connectivity check: OK');
}

main().catch((error) => {
  console.error(`Supabase connectivity check: FAILED`);
  console.error(error.message);
  process.exit(1);
});
