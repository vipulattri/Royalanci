/**
 * Local: runs Vite dev server.
 *
 * Render sets `RENDER=true`. If the dashboard Start Command is mistakenly still
 * `npm run dev`, we run `server/production-server.mjs` (static + catalog API on PORT).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.env.RENDER === 'true') {
  const child = spawn(process.execPath, ['server/production-server.mjs'], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  const child = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}
