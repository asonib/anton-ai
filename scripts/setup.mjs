#!/usr/bin/env node
/**
 * One-shot project bootstrap (cross-platform):
 *   1. copies .env.example → .env and backend/.env (if missing)
 *   2. installs root, backend and frontend dependencies
 *   3. starts MySQL via docker compose and waits for the healthcheck
 *   4. generates the Prisma client and syncs the schema (prisma db push — no migrations)
 *
 * Flags: --skip-docker   (use an existing MySQL; DATABASE_URL must point at it)
 *        --skip-install
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const c = { cyan: (s) => `\x1b[36m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m` };

function step(title) {
  console.log(`\n${c.cyan('▶')} ${title}`);
}

function run(cmd, cwd = root, { optional = false } = {}) {
  console.log(c.yellow(`  $ ${cmd}`));
  const res = spawnSync(cmd, { cwd, stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    if (optional) return false;
    console.error(c.red(`\n✖ Command failed: ${cmd}`));
    process.exit(res.status ?? 1);
  }
  return true;
}

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 18 || (major === 18 && minor < 18)) {
  console.error(c.red(`Node ${process.versions.node} detected — Node >= 18.18 is required (20 LTS+ recommended).`));
  process.exit(1);
}

step('Environment files');
for (const target of ['.env', 'backend/.env', 'frontend/.env']) {
  const src = target.startsWith('frontend') ? 'frontend/.env.example' : '.env.example';
  const dst = join(root, target);
  if (existsSync(dst)) console.log(`  = ${target} already exists (kept)`);
  else {
    copyFileSync(join(root, src), dst);
    console.log(c.green(`  + created ${target}`));
  }
}

if (!args.has('--skip-install')) {
  step('Installing dependencies');
  run('npm install');
  run('npm install', join(root, 'backend'));
  run('npm install', join(root, 'frontend'));
}

if (!args.has('--skip-docker')) {
  step('Starting MySQL (docker compose)');
  const ok = run('docker compose up -d --wait mysql', root, { optional: true });
  if (!ok) {
    console.error(c.red('\n✖ Could not start MySQL with Docker. Is Docker Desktop running?'));
    console.error('  Re-run with `npm run setup -- --skip-docker` to use an existing MySQL server.');
    process.exit(1);
  }
}

step('Prisma: generate client + push schema');
run('npx prisma generate', join(root, 'backend'));
run('npx prisma db push --skip-generate', join(root, 'backend'));

console.log(`\n${c.green('✔ Setup complete.')}

  Next steps:
    1. (Default provider) install Ollama and run:  ollama pull llama3.2
       — or add OPENAI / ANTHROPIC / GEMINI / XAI keys to backend/.env
    2. npm run dev
    3. open http://localhost:5173
`);
