#!/usr/bin/env node
/**
 * Fails the build if the gzipped dist output exceeds the budget.
 * Keeps the Solid migration honest: the shell should stay small.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGETS = {
  js: 60 * 1024, // 60 KB gzip for all JS (39.4 KB at migration time)
  css: 10 * 1024, // 10 KB gzip for all CSS (4.8 KB at migration time)
};

const assetsDir = join(process.cwd(), 'dist', 'assets');
const totals = { js: 0, css: 0 };

for (const file of readdirSync(assetsDir)) {
  const path = join(assetsDir, file);
  if (!statSync(path).isFile()) continue;
  const ext = file.endsWith('.js') ? 'js' : file.endsWith('.css') ? 'css' : null;
  if (!ext) continue;
  totals[ext] += gzipSync(readFileSync(path)).length;
}

let failed = false;
for (const [ext, budget] of Object.entries(BUDGETS)) {
  const used = totals[ext];
  const pct = ((used / budget) * 100).toFixed(0);
  const status = used <= budget ? 'OK' : 'OVER BUDGET';
  console.log(`${ext.toUpperCase()}: ${(used / 1024).toFixed(1)} KB gzip / ${(budget / 1024).toFixed(0)} KB budget (${pct}%) — ${status}`);
  if (used > budget) failed = true;
}

process.exit(failed ? 1 : 0);
