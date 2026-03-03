import { spawnSync } from 'node:child_process';

const command = process.argv[2];

function runSupabase(args) {
  const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(bin, ['supabase', ...args], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

switch (command) {
  case 'login': {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    if (token) {
      runSupabase(['login', '--token', token]);
    } else {
      runSupabase(['login']);
    }
    break;
  }
  case 'link': {
    const projectRef = requireEnv('SUPABASE_PROJECT_REF');
    const args = ['link', '--project-ref', projectRef];
    if (process.env.SUPABASE_DB_PASSWORD) {
      args.push('--password', process.env.SUPABASE_DB_PASSWORD);
    }
    runSupabase(args);
    break;
  }
  case 'push': {
    runSupabase(['db', 'push']);
    break;
  }
  case 'deploy': {
    runSupabase(['db', 'push', '--linked', '--include-all']);
    break;
  }
  case 'status': {
    runSupabase(['migration', 'list']);
    break;
  }
  default: {
    console.error('Usage: node tools/supabase-cli.mjs <login|link|push|deploy|status>');
    process.exit(1);
  }
}
