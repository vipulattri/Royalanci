/**
 * Render / Docker / any host that sets PORT — serve static `dist` on 0.0.0.0.
 * Do not use `npm run dev` in production (wrong port, wrong bind).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = String(process.env.PORT || 4173);

const child = spawn(
  'npx',
  ['serve', 'dist', '-s', '-l', `tcp://0.0.0.0:${port}`],
  {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    env: process.env,
  }
);

child.on('exit', (code) => process.exit(code ?? 0));
