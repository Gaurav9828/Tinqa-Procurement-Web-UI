#!/usr/bin/env node
/**
 * Runs the tests of all four TinQa services and prints one status table (docs/engineering-rules.md, rule 39):
 *
 *   service | unit passed/total | integration passed/total | result
 *
 *   - Procurement BE and Ecommerce BE: `mvn test`, which runs the unit tests and the Testcontainers integration
 *     tests (counted apart from the surefire reports: *IT and *IntegrationTest are integration tests).
 *   - Web UI and storefront: Vitest unit tests; with --e2e also the Playwright suite on a fresh build, then the
 *     e2e gate.
 *
 * The services run side by side. A backend whose integration tests can't start because Docker is down is reported
 * as "not run", never as passing. Exits 1 unless every suite that was asked for ran and passed.
 * Logs: reports/test-all/<service>.log
 *
 * Usage: node scripts/test-all.mjs [--e2e] [--only=procurement-be,ecommerce-be,web-ui,storefront]
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WORKSPACE = path.resolve(ROOT, '..');
const LOG_DIR = path.join(ROOT, 'reports', 'test-all');
const E2E = process.argv.includes('--e2e');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length).split(',');

const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = color(31), green = color(32), yellow = color(33), bold = color(1);

const SERVICES = [
  { key: 'procurement-be', name: 'Procurement BE', dir: 'TinQa_Procurement_Backend', kind: 'maven', cmd: ['mvn', '-B', '-q', 'test', '-Dquality.skip=true'] },
  { key: 'ecommerce-be', name: 'Ecommerce BE', dir: 'TinQa_Ecommerce_BE', kind: 'maven', cmd: ['./mvnw', '-B', '-q', 'test'] },
  { key: 'web-ui', name: 'Procurement Web UI', dir: 'Tinqa-Procurement-Web-UI', kind: 'vite', buildMode: null },
  // dev: a prod build refuses a local (non-https) API URL
  { key: 'storefront', name: 'Storefront', dir: 'TinQa_Ecommerce_FE', kind: 'vite', buildMode: 'dev' },
].filter((s) => !ONLY || ONLY.includes(s.key));

const dockerUp = () => spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;

// Runs one command after another, appending to the service's log; resolves to the first non-zero exit code, or 0.
function runAll(cwd, log, commands) {
  return commands.reduce(
    (previous, [cmd, ...args]) =>
      previous.then((code) =>
        code !== 0
          ? code
          : new Promise((resolve) => {
              fs.appendFileSync(log, `\n$ ${cmd} ${args.join(' ')}\n`);
              const out = fs.openSync(log, 'a');
              spawn(cmd, args, { cwd, stdio: ['ignore', out, out] }).on('close', (c) => resolve(c ?? 1));
            })
      ),
    Promise.resolve(0)
  );
}

function surefireCounts(dir) {
  const counts = { unit: { passed: 0, total: 0 }, integration: { passed: 0, total: 0 }, failing: [] };
  if (!fs.existsSync(dir)) return counts;
  for (const file of fs.readdirSync(dir).filter((f) => f.startsWith('TEST-') && f.endsWith('.xml'))) {
    const xml = fs.readFileSync(path.join(dir, file), 'utf8');
    const suite = xml.match(/<testsuite\b[^>]*>/)?.[0] ?? '';
    const attr = (name) => Number(suite.match(new RegExp(`\\b${name}="(\\d+)"`))?.[1] ?? 0);
    const name = suite.match(/\bname="([^"]+)"/)?.[1] ?? file;
    const bucket = /IT$|IntegrationTest$/.test(name) ? counts.integration : counts.unit;
    const failed = attr('failures') + attr('errors');
    bucket.total += attr('tests') - attr('skipped');
    bucket.passed += attr('tests') - attr('skipped') - failed;
    for (const [, test] of xml.matchAll(/<testcase\b[^>]*\bname="([^"]+)"[^>]*>\s*<(?:failure|error)\b/g)) {
      counts.failing.push(`${name.split('.').pop()}.${test}`);
    }
  }
  return counts;
}

function vitestCounts(file) {
  if (!fs.existsSync(file)) return null;
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const failing = report.testResults.flatMap((r) =>
    r.assertionResults.filter((a) => a.status === 'failed').map((a) => `${path.relative(ROOT, r.name)} > ${a.title}`)
  );
  return { passed: report.numPassedTests, total: report.numTotalTests - report.numPendingTests - report.numTodoTests, failing };
}

function playwrightCounts(file) {
  if (!fs.existsSync(file)) return null;
  const { stats } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { passed: stats.expected + stats.flaky, total: stats.expected + stats.flaky + stats.unexpected, flaky: stats.flaky };
}

async function runService(service) {
  const cwd = path.join(WORKSPACE, service.dir);
  const log = path.join(LOG_DIR, `${service.key}.log`);
  fs.writeFileSync(log, '');

  if (service.kind === 'maven') {
    if (!dockerUp()) return { ...service, notRun: 'Docker is not running (start Docker Desktop and run again)' };
    const reports = path.join(cwd, 'target', 'surefire-reports');
    // Old reports would be counted as this run's
    fs.rmSync(reports, { recursive: true, force: true });
    const code = await runAll(cwd, log, [service.cmd]);
    const counts = surefireCounts(reports);
    const ran = counts.unit.total + counts.integration.total > 0;
    return { ...service, ...counts, notRun: ran ? null : 'the build failed before any test ran', ok: code === 0 && ran };
  }

  const unitReport = path.join(cwd, 'reports', 'test-all', 'vitest.json');
  fs.rmSync(unitReport, { force: true });
  const unitCode = await runAll(cwd, log, [['npx', 'vitest', 'run', '--reporter=default', '--reporter=json', `--outputFile=${unitReport}`]]);
  const unit = vitestCounts(unitReport);
  const result = { ...service, unit, failing: unit?.failing ?? [], notRun: unit ? null : 'Vitest did not start' };
  if (!E2E) return { ...result, integration: null, ok: unitCode === 0 && !!unit };

  const e2eReport = path.join(cwd, 'reports', 'e2e', 'results.json');
  fs.rmSync(e2eReport, { force: true });
  const build = ['npx', 'vite', 'build', ...(service.buildMode ? ['--mode', service.buildMode] : [])];
  const gate = ['node', 'scripts/e2e-gate.mjs', ...(service.buildMode ? [`--mode=${service.buildMode}`] : [])];
  // The gate runs the Playwright suite itself and then checks the call and bundle budgets
  const e2eCode = await runAll(cwd, log, [build, gate]);
  const integration = playwrightCounts(e2eReport);
  return { ...result, integration, e2eCode, ok: unitCode === 0 && !!unit && e2eCode === 0 && !!integration };
}

const cell = (c) => (c ? `${c.passed}/${c.total}` : '—');

fs.mkdirSync(LOG_DIR, { recursive: true });
for (const s of SERVICES.filter((s) => s.kind === 'vite')) fs.mkdirSync(path.join(WORKSPACE, s.dir, 'reports', 'test-all'), { recursive: true });
console.log(bold(`Running ${SERVICES.map((s) => s.name).join(', ')}${E2E ? ' (with e2e)' : ''}…`));
const results = await Promise.all(SERVICES.map(runService));

const rows = results.map((r) => [
  r.name,
  cell(r.unit),
  r.kind === 'vite' && !E2E ? 'not asked (--e2e)' : cell(r.integration),
  r.notRun ? yellow('not run') : r.ok ? green('pass') : red('fail'),
]);
const header = ['Service', 'Unit passed/total', 'Integration passed/total', 'Result'];
const plain = (s) => s.replace(/\x1b\[\d+m/g, '');
const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => plain(row[i]).length)));
const line = (row) => `| ${row.map((c, i) => c + ' '.repeat(widths[i] - plain(c).length)).join(' | ')} |`;
console.log('\n' + line(header) + '\n' + line(widths.map((w) => '-'.repeat(w))) + '\n' + rows.map(line).join('\n'));

for (const r of results) {
  if (r.notRun) console.log(yellow(`\n${r.name}: not run, ${r.notRun}.`));
  if (r.failing?.length) console.log(red(`\n${r.name} failing tests:\n  - ${r.failing.join('\n  - ')}`));
  if (r.integration?.flaky) console.log(yellow(`\n${r.name}: ${r.integration.flaky} flaky e2e test(s): fix them (rule 40).`));
  if (r.e2eCode && r.integration && r.integration.passed === r.integration.total) console.log(red(`\n${r.name}: e2e tests passed but the e2e gate failed (call or bundle budgets).`));
  if (!r.ok) console.log(`  log: ${path.relative(ROOT, path.join(LOG_DIR, `${r.key}.log`))}`);
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
