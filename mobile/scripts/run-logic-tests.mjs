// Runs every *.test.mjs under src/ with the TypeScript loader. Usage: npm run test:logic
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const found = [];
(function walk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); statSync(p).isDirectory() ? walk(p) : f.endsWith('.test.mjs') && found.push(p); } })(join(root, 'src'));

let failed = 0;
for (const file of found.sort()) {
  const r = spawnSync(process.execPath, ['--no-warnings', '--import', join(root, 'scripts/register-ts.mjs'), file], { encoding: 'utf8' });
  const last = (r.stdout || '').trim().split('\n').filter((l) => /checks passed/.test(l)).pop();
  console.log(r.status === 0 ? `ok   ${file.replace(root + '/', '')}  (${last ?? 'passed'})` : `FAIL ${file.replace(root + '/', '')}\n${r.stdout}\n${r.stderr}`);
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) FAILED` : `\nAll ${found.length} logic test files passed`);
process.exit(failed ? 1 : 0);
