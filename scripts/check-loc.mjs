// Enforces the project line budget: every line of index.html and src/** counts.
// The game stays tiny on purpose — if this fails, trim code before raising LIMIT.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// 1100 -> 1300 (2026-06-10): story update — 60x50 map, NPCs, boss, multi-page dialogs
// 1300 -> 1500 (2026-06-10): full quest — 90x70 world, party/EXP/evolve, trainers, skills
const LIMIT = 1500;

const files = ['index.html'];
const walk = dir => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
};
walk('src');

let total = 0;
for (const f of files) {
  const n = readFileSync(f, 'utf8').split('\n').length;
  total += n;
  console.log(String(n).padStart(6), f);
}
console.log(String(total).padStart(6), `total (limit ${LIMIT})`);

if (total > LIMIT) {
  console.error(`\nLOC budget exceeded: ${total} > ${LIMIT}.`);
  console.error('Trim code before raising LIMIT in scripts/check-loc.mjs.');
  process.exit(1);
}
