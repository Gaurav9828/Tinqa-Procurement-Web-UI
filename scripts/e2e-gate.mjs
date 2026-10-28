#!/usr/bin/env node
/**
 * Runs after every build (npm postbuild*), on the bundle that was just built:
 *
 *   1. End-to-end tests (e2e/, Playwright + Chromium): every page loads without errors, the main journeys work.
 *   2. API call budgets, from each test's network record (reports/e2e/network/):
 *        - no GET sent twice while one page loads (wasted backend and database work)
 *        - no API call the tests have no fixture for (a new endpoint the tests don't cover yet)
 *        - no request to a host outside the app and its API (third-party calls are a privacy and security risk)
 *        - at most e2e.maxApiCallsPerPage API calls for one page (e2e.pageBudgets: a reviewed limit, with its reason,
 *          for a page that needs more)
 *   3. Bundle budgets: gzip size of what the first page load downloads, and of the largest script chunk.
 *
 * Modes as in quality-gate.mjs: test failures fail every mode; budgets warn in dev and fail in uat / prod.
 * Report: reports/quality/e2e.json
 *
 * Usage: node scripts/e2e-gate.mjs --mode=prod      (QG_SKIP=e2e skips the browser tests, e.g. no Chromium)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'quality-gate.config.json'), 'utf8'));
const MODE = (process.argv.find((a) => a.startsWith('--mode='))?.slice('--mode='.length) || process.env.QG_MODE || 'dev').toLowerCase();
if (!['dev', 'uat', 'prod'].includes(MODE)) throw new Error(`Unknown --mode=${MODE} (dev | uat | prod)`);
const STRICT = MODE !== 'dev';
const SKIP = new Set((process.env.QG_SKIP || '').split(',').map((s) => s.trim()).filter(Boolean));
const DIST = path.join(ROOT, 'dist');
const E2E_DIR = path.join(ROOT, 'reports', 'e2e');
const REPORT_DIR = path.join(ROOT, 'reports', 'quality');

const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = color(31), green = color(32), yellow = color(33), bold = color(1), dim = color(2);
const kb = (bytes) => Math.round(bytes / 102.4) / 10;

function e2e() {
  if (SKIP.has('e2e')) return { skipped: true };
  fs.rmSync(E2E_DIR, { recursive: true, force: true });
  const res = spawnSync('npx', ['playwright', 'test'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, E2E_MODE: MODE },
    timeout: 20 * 60_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  if (/Executable doesn't exist|npx playwright install/.test(out)) return { unavailable: 'Chromium is not installed: run "npx playwright install chromium"' };

  const failed = [];
  let total = 0;
  try {
    const results = JSON.parse(fs.readFileSync(path.join(E2E_DIR, 'results.json'), 'utf8'));
    const walk = (suite, titles) => {
      for (const spec of suite.specs ?? []) {
        for (const t of spec.tests) {
          total += 1;
          if (t.status === 'unexpected' || t.status === 'flaky') {
            const error = t.results.flatMap((r) => r.errors ?? []).map((e) => e.message ?? '').join(' ').replace(/\x1b\[[0-9;]*m/g, '');
            failed.push({ name: [...titles, spec.title].join(' › '), message: error.split('\n').find((l) => l.trim()) ?? '' });
          }
        }
      }
      for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
    };
    for (const suite of results.suites ?? []) walk(suite, []);
  } catch {
    return { crashed: true, output: out.split('\n').slice(-30).join('\n') };
  }
  return { total, failed };
}

/** Budget findings from each test's network record. */
function callBudgets() {
  const dir = path.join(E2E_DIR, 'network');
  if (!fs.existsSync(dir)) return [];
  const max = CONFIG.e2e?.maxApiCallsPerPage ?? 8;
  const findings = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const rec = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const gets = new Map();
    for (const c of rec.api.filter((c) => c.method === 'GET')) gets.set(c.path, (gets.get(c.path) ?? 0) + 1);
    for (const [p, n] of gets) if (n > 1) findings.push(`${rec.test}: GET ${p} sent ${n} times while the page loaded`);
    for (const c of rec.api.filter((c) => !c.mocked)) findings.push(`${rec.test}: ${c.method} ${c.path} has no e2e fixture (add it to e2e/support/test.ts)`);
    for (const x of rec.external) findings.push(`${rec.test}: request outside the app and its API: ${x}`);
    const pageMax = CONFIG.e2e?.pageBudgets?.[rec.page]?.max ?? max;
    if (rec.api.length > pageMax) findings.push(`${rec.test}: ${rec.api.length} API calls (budget ${pageMax})`);
  }
  return findings;
}

/** gzip sizes of what index.html loads up front, and of the largest script chunk. */
function bundle() {
  const index = path.join(DIST, 'index.html');
  if (!fs.existsSync(index)) return null;
  const html = fs.readFileSync(index, 'utf8');
  const gz = (rel) => gzipSync(fs.readFileSync(path.join(DIST, rel.replace(/^\//, '')))).length;
  const initialFiles = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  const initial = [...new Set(initialFiles)].reduce((sum, f) => sum + gz(f), 0);
  const scripts = fs.readdirSync(path.join(DIST, 'assets')).filter((f) => f.endsWith('.js'));
  const largest = scripts.map((f) => ({ file: f, size: gz(`assets/${f}`) })).sort((a, b) => b.size - a.size)[0];
  return { initial, largest };
}

function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const step = (name) => process.stdout.write(`${dim('›')} ${name}… `);

  step('End-to-end tests (Chromium, built bundle)');
  const t = e2e();
  console.log(t.skipped ? yellow('skipped') : t.unavailable ? yellow(t.unavailable) : t.crashed ? red('crashed') : `${t.total - t.failed.length}/${t.total} passed`);

  step('API call budgets per page');
  const budgets = t.skipped || t.unavailable || t.crashed ? [] : callBudgets();
  console.log(budgets.length ? yellow(`${budgets.length} finding(s)`) : green('within budget'));

  step('Bundle budgets (gzip)');
  const b = bundle();
  const limits = CONFIG.bundle ?? {};
  console.log(b ? `first load ${kb(b.initial)} kB (budget ${limits.maxInitialKbGzip ?? 'none'}), largest chunk ${kb(b.largest.size)} kB (budget ${limits.maxChunkKbGzip ?? 'none'})` : yellow('no dist/ (build first)'));

  const reasons = [];
  const strictOnly = [];
  if (t.crashed) reasons.push(`the end-to-end run crashed:\n${t.output}`);
  if (t.failed?.length) reasons.push(`${t.failed.length} failing end-to-end test(s)`);
  if (t.unavailable) strictOnly.push(t.unavailable);
  if (t.skipped) strictOnly.push('end-to-end tests skipped (QG_SKIP=e2e)');
  if (budgets.length) strictOnly.push(`${budgets.length} API call budget finding(s)`);
  if (b && limits.maxInitialKbGzip && kb(b.initial) > limits.maxInitialKbGzip)
    strictOnly.push(`first page load is ${kb(b.initial)} kB gzip, over the ${limits.maxInitialKbGzip} kB budget`);
  if (b && limits.maxChunkKbGzip && kb(b.largest.size) > limits.maxChunkKbGzip)
    strictOnly.push(`${b.largest.file} is ${kb(b.largest.size)} kB gzip, over the ${limits.maxChunkKbGzip} kB chunk budget`);
  const warnings = [];
  if (STRICT) reasons.push(...strictOnly);
  else warnings.push(...strictOnly.map((w) => `${w} — allowed in dev, fails UAT/production builds`));

  const passed = reasons.length === 0;
  fs.writeFileSync(path.join(REPORT_DIR, 'e2e.json'), JSON.stringify({ generatedAt: new Date().toISOString(), mode: MODE, passed, reasons, warnings, tests: t, budgets, bundle: b }, null, 2));

  console.log('');
  for (const f of t.failed ?? []) console.log(`  ${red('E2E')} ${f.name}${f.message ? dim(` — ${f.message.slice(0, 160)}`) : ''}`);
  for (const f of budgets.slice(0, 30)) console.log(`  ${yellow('CALLS')} ${f}`);
  for (const w of warnings) console.log(`  ${yellow('!')} ${w}`);
  console.log(`\n${bold(`E2E gate (${MODE}${STRICT ? ', strict' : ''}):`)} ${passed ? green('PASSED') : red('FAILED')}  ${dim('report → reports/quality/e2e.json, traces → reports/e2e/artifacts')}`);
  for (const r of reasons) console.log(`  ${red('✗')} ${r}`);
  if (!passed) process.exitCode = 1;
}

main();
