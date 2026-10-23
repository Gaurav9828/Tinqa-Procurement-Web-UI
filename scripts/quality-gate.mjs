#!/usr/bin/env node
/**
 * Local quality gate (our free replacement for SonarQube). Runs before every `npm run build`.
 *
 *   1. TypeScript type-check
 *   2. ESLint static analysis: Sonar's open-source rules (eslint-plugin-sonarjs), security rules, XSS sinks
 *   3. Secret scan: keys, tokens, private keys and passwords committed to the repo
 *   4. Dependency vulnerabilities (OSV.dev database, checked against package-lock.json)
 *   5. Unit tests + line coverage
 *
 * Like Sonar's "new code" mode, existing findings live in quality-gate.baseline.json and only NEW findings
 * fail the build, so the codebase can only get better. Report: reports/quality/index.html
 *
 * Usage:
 *   node scripts/quality-gate.mjs                    run the gate
 *   node scripts/quality-gate.mjs --update-baseline  accept the current findings as the new baseline
 *   QG_SKIP=audit,tests node scripts/quality-gate.mjs   skip steps (audit | tests | typecheck) e.g. offline
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'quality');
const BASELINE_FILE = path.join(ROOT, 'quality-gate.baseline.json');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'quality-gate.config.json'), 'utf8'));
const UPDATE_BASELINE = process.argv.includes('--update-baseline');
const SKIP = new Set((process.env.QG_SKIP || '').split(',').map((s) => s.trim()).filter(Boolean));

const SECURITY_RULE_PREFIXES = ['security/', 'no-unsanitized/', 'secret/'];
const SECURITY_SONAR_RULES = new Set(CONFIG.securitySonarRules);
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|pdf|zip|gz|mp4|mp3|xlsx|docx)$/i;

const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = color(31), green = color(32), yellow = color(33), bold = color(1), dim = color(2);

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

function run(cmd, args, timeoutMs) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  return { code: res.status, out: `${res.stdout || ''}${res.stderr || ''}`, stdout: res.stdout || '' };
}

function category(rule) {
  if (SECURITY_RULE_PREFIXES.some((p) => rule.startsWith(p)) || SECURITY_SONAR_RULES.has(rule)) return 'Security';
  if (rule.startsWith('react-hooks/') || !rule.includes('/')) return 'Reliability';
  return 'Maintainability';
}

/** Stable across unrelated edits: keyed on rule + file + the offending source line, not its line number. */
function fingerprint(issue, sourceLines) {
  const text = (sourceLines[issue.line - 1] || '').trim();
  return `${issue.rule}|${issue.file}|${hash(text)}`;
}

// ---------------------------------------------------------------- steps

function typecheck() {
  if (SKIP.has('typecheck')) return { skipped: true };
  const res = run('npx', ['tsc', '-b', '--pretty', 'false'], 10 * 60_000);
  const errors = res.out.split('\n').filter((l) => /error TS\d+/.test(l));
  return { ok: res.code === 0, errors };
}

async function lint() {
  const eslint = new ESLint({ cwd: ROOT });
  const results = await eslint.lintFiles(['.']);
  const issues = [];
  for (const r of results) {
    const lines = (r.source ?? fs.readFileSync(r.filePath, 'utf8')).split('\n');
    for (const m of r.messages) {
      if (!m.ruleId) continue; // parse errors surface through the type-check
      const issue = {
        rule: m.ruleId,
        file: rel(r.filePath),
        line: m.line,
        severity: m.severity === 2 ? 'error' : 'warning',
        message: m.message,
      };
      issue.category = category(issue.rule);
      issue.fingerprint = fingerprint(issue, lines);
      issues.push(issue);
    }
  }
  return issues;
}

function listRepoFiles() {
  const git = run('git', ['ls-files', '-co', '--exclude-standard'], 30_000);
  if (git.code === 0) return git.stdout.split('\n').filter(Boolean);
  // No git (e.g. inside docker build): walk the tree
  const skip = new Set(['node_modules', 'dist', 'coverage', 'reports', '.git']);
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(rel(p));
    }
  };
  walk(ROOT);
  return out;
}

function scanSecrets() {
  const patterns = CONFIG.secrets.patterns.map((p) => ({ ...p, re: new RegExp(p.regex, p.flags || '') }));
  const ignore = CONFIG.secrets.ignorePaths.map((p) => new RegExp(p));
  const issues = [];
  for (const file of listRepoFiles()) {
    if (BINARY_EXT.test(file) || ignore.some((re) => re.test(file))) continue;
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs) || fs.statSync(abs).size > 2_000_000) continue;
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    lines.forEach((text, i) => {
      for (const p of patterns) {
        if (!p.re.test(text)) continue;
        const issue = { rule: `secret/${p.id}`, file, line: i + 1, severity: 'error', category: 'Security', message: p.message };
        issue.fingerprint = fingerprint(issue, lines);
        issues.push(issue);
      }
    });
  }
  return issues;
}

const OSV_API = 'https://api.osv.dev/v1';

async function osvFetch(url, body, signal) {
  const res = await fetch(url, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' }, signal } : { signal });
  if (!res.ok) throw new Error(`OSV ${res.status}`);
  return res.json();
}

/** Every package in package-lock.json checked against OSV.dev (free, no key; npm's audit endpoint is often unreachable). */
async function audit() {
  if (SKIP.has('audit')) return { skipped: true };
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
  const deps = new Map();
  for (const [key, p] of Object.entries(lock.packages || {})) {
    if (!key || !p.version || p.link) continue;
    const name = p.name || key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
    const id = `${name}@${p.version}`;
    if (!deps.has(id)) deps.set(id, { name, version: p.version, dev: Boolean(p.dev) });
    else if (!p.dev) deps.get(id).dev = false;
  }
  const list = [...deps.values()];
  const signal = AbortSignal.timeout(CONFIG.dependencies.auditTimeoutSeconds * 1000);
  const hits = []; // [dep, vulnId]
  try {
    for (let i = 0; i < list.length; i += 500) {
      const chunk = list.slice(i, i + 500);
      const res = await osvFetch(`${OSV_API}/querybatch`, { queries: chunk.map((d) => ({ package: { ecosystem: 'npm', name: d.name }, version: d.version })) }, signal);
      res.results.forEach((r, j) => (r.vulns || []).forEach((v) => hits.push([chunk[j], v.id])));
    }
    const details = new Map();
    await Promise.all([...new Set(hits.map(([, id]) => id))].map(async (id) => details.set(id, await osvFetch(`${OSV_API}/vulns/${id}`, null, signal))));

    const today = new Date().toISOString().slice(0, 10);
    const allowed = new Map(CONFIG.dependencies.allow.filter((a) => !a.until || a.until >= today).map((a) => [a.advisory, a]));
    const vulns = hits.map(([dep, id]) => {
      const v = details.get(id);
      const ids = [v.id, ...(v.aliases || [])];
      const fixed = (v.affected || [])
        .filter((a) => a.package?.name === dep.name)
        .flatMap((a) => (a.ranges || []).flatMap((r) => r.events.filter((e) => e.fixed).map((e) => e.fixed)));
      const severity = String(v.database_specific?.severity || 'moderate').toLowerCase();
      return {
        package: `${dep.name}@${dep.version}${dep.dev ? ' (dev)' : ''}`,
        severity: severity === 'medium' ? 'moderate' : severity,
        title: v.summary || id,
        advisory: v.id,
        url: `https://osv.dev/vulnerability/${v.id}`,
        fix: fixed.length ? `upgrade to ${fixed.join(' / ')}` : 'no fix yet',
        allowed: ids.map((x) => allowed.get(x)?.reason).find(Boolean),
      };
    });
    return { vulns };
  } catch (err) {
    return { unavailable: true, reason: signal.aborted ? 'OSV.dev timed out (offline?)' : `OSV.dev check failed: ${err.message}` };
  }
}

function tests() {
  if (SKIP.has('tests')) return { skipped: true };
  const jsonOut = path.join(REPORT_DIR, 'tests.json');
  run('npx', ['vitest', 'run', '--coverage', '--reporter=dot', '--reporter=json', `--outputFile.json=${jsonOut}`], 15 * 60_000);
  let failed = [];
  let total = 0;
  try {
    const t = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
    total = t.numTotalTests;
    failed = t.testResults.flatMap((f) =>
      f.assertionResults.filter((a) => a.status === 'failed').map((a) => ({ file: rel(f.name), name: a.fullName, message: (a.failureMessages[0] || '').split('\n')[0] }))
    );
  } catch {
    failed = [{ file: '-', name: 'Test run crashed', message: 'see `npm test` output' }];
  }
  const coverage = readCoverage();
  return { total, failed, coverage };
}

function readCoverage() {
  const lcov = path.join(ROOT, 'coverage', 'lcov.info');
  if (!fs.existsSync(lcov)) return null;
  let found = 0, hit = 0;
  for (const line of fs.readFileSync(lcov, 'utf8').split('\n')) {
    if (line.startsWith('LF:')) found += Number(line.slice(3));
    else if (line.startsWith('LH:')) hit += Number(line.slice(3));
  }
  return found ? Math.round((hit / found) * 1000) / 10 : null;
}

// ---------------------------------------------------------------- baseline

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')).issues;
}

function countBy(issues) {
  const counts = {};
  for (const i of issues) counts[i.fingerprint] = (counts[i.fingerprint] || 0) + 1;
  return counts;
}

function writeBaseline(issues) {
  const counts = countBy(issues);
  const sorted = Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify({ note: 'Accepted existing findings. Regenerate with: npm run quality:baseline', issues: sorted }, null, 2)}\n`);
}

/** Marks issues beyond the baseline's count for their fingerprint as new. */
function markNew(issues, baseline) {
  const remaining = { ...baseline };
  for (const i of issues) {
    if (remaining[i.fingerprint] > 0) {
      remaining[i.fingerprint] -= 1;
      i.isNew = false;
    } else i.isNew = true;
  }
  return Object.values(remaining).reduce((a, b) => a + b, 0); // baseline findings that are gone (fixed)
}

// ---------------------------------------------------------------- report

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function writeHtml(r) {
  const card = (label, value, state) => `<div class="card ${state}"><div class="v">${esc(value)}</div><div class="l">${esc(label)}</div></div>`;
  const row = (i) =>
    `<tr class="${i.isNew ? 'new' : ''}" data-cat="${i.category}" data-new="${i.isNew}"><td>${i.isNew ? '<b>NEW</b>' : ''}</td><td>${i.category}</td><td>${i.severity}</td><td><code>${esc(i.rule)}</code></td><td><code>${esc(i.file)}:${i.line}</code></td><td>${esc(i.message)}</td></tr>`;
  const vulnRow = (v) =>
    `<tr class="${v.allowed ? '' : 'new'}"><td>${esc(v.severity)}</td><td><code>${esc(v.package)}</code></td><td><a href="${esc(v.url)}">${esc(v.title)}</a></td><td>${esc(v.fix)}</td><td>${esc(v.allowed || '')}</td></tr>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quality Gate Report</title><style>
:root{--bg:#f7f7f8;--fg:#1d1d1f;--muted:#6b6b70;--card:#fff;--line:#e3e3e6;--ok:#1a7f37;--bad:#cf222e;--warn:#9a6700;--newbg:#fff1f0}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececf0;--muted:#9a9aa2;--card:#1d1d21;--line:#2e2e34;--ok:#3fb950;--bad:#f85149;--warn:#d29922;--newbg:#3a1d1d}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:0 auto;padding:24px 16px}
h1{margin:0 0 4px}.status{font-size:20px;font-weight:700}.pass{color:var(--ok)}.fail{color:var(--bad)}.muted{color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:20px 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.card .v{font-size:24px;font-weight:700}.card .l{color:var(--muted)}
.card.bad .v{color:var(--bad)}.card.ok .v{color:var(--ok)}.card.warn .v{color:var(--warn)}
ul.reasons{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 28px}
.tbl{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;margin-bottom:24px}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:6px 10px;border-bottom:1px solid var(--line);vertical-align:top}
tr.new{background:var(--newbg)}code{font-size:12px}a{color:inherit}.filters{margin:8px 0;display:flex;gap:8px;flex-wrap:wrap}
select,label{font:inherit;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:6px;padding:4px 8px}
</style></head><body><main>
<h1>Quality Gate</h1><div class="muted">${esc(r.generatedAt)}</div>
<p class="status ${r.passed ? 'pass' : 'fail'}">${r.passed ? 'PASSED' : 'FAILED'}</p>
${r.reasons.length ? `<ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${r.warnings.length ? `<ul class="reasons">${r.warnings.map((x) => `<li class="muted">${esc(x)}</li>`).join('')}</ul>` : ''}
<div class="cards">
${card('New issues', r.newIssues.length, r.newIssues.length ? 'bad' : 'ok')}
${card('Security issues', r.byCategory.Security, r.byCategory.Security ? 'warn' : 'ok')}
${card('Reliability issues', r.byCategory.Reliability, '')}
${card('Maintainability issues', r.byCategory.Maintainability, '')}
${card('Fixed since baseline', r.fixed, r.fixed ? 'ok' : '')}
${card('Vulnerable deps (high+)', r.blockingVulns, r.blockingVulns ? 'bad' : 'ok')}
${card('Failed tests', r.tests.skipped ? 'skipped' : r.tests.failed.length, r.tests.failed?.length ? 'bad' : 'ok')}
${card('Line coverage', r.tests.coverage != null ? `${r.tests.coverage}%` : 'n/a', r.coverageOk === false ? 'bad' : 'ok')}
</div>
${r.tests.failed?.length ? `<h2>Failed tests</h2><div class="tbl"><table><tr><th>File</th><th>Test</th><th>Message</th></tr>${r.tests.failed.map((t) => `<tr class="new"><td><code>${esc(t.file)}</code></td><td>${esc(t.name)}</td><td>${esc(t.message)}</td></tr>`).join('')}</table></div>` : ''}
${r.vulns.length ? `<h2>Dependency vulnerabilities</h2><div class="tbl"><table><tr><th>Severity</th><th>Package</th><th>Advisory</th><th>Fix</th><th>Accepted because</th></tr>${r.vulns.map(vulnRow).join('')}</table></div>` : ''}
<h2>Code issues (${r.issues.length})</h2>
<div class="filters"><select id="cat"><option value="">All categories</option><option>Security</option><option>Reliability</option><option>Maintainability</option></select>
<label><input type="checkbox" id="onlyNew"> Only new</label></div>
<div class="tbl"><table id="issues"><tr><th></th><th>Category</th><th>Severity</th><th>Rule</th><th>Location</th><th>Message</th></tr>${r.issues.map(row).join('')}</table></div>
<script>
const cat=document.getElementById('cat'),onlyNew=document.getElementById('onlyNew');
function f(){document.querySelectorAll('#issues tr[data-cat]').forEach(tr=>{tr.hidden=(cat.value&&tr.dataset.cat!==cat.value)||(onlyNew.checked&&tr.dataset.new!=='true')})}
cat.onchange=f;onlyNew.onchange=f;
</script></main></body></html>`;
  fs.writeFileSync(path.join(REPORT_DIR, 'index.html'), html);
}

// ---------------------------------------------------------------- main

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const step = (name) => process.stdout.write(`${dim('›')} ${name}… `);
  const done = (msg) => console.log(msg);

  step('Type-check');
  const tc = typecheck();
  done(tc.skipped ? yellow('skipped') : tc.ok ? green('ok') : red(`${tc.errors.length} error(s)`));

  step('Static analysis (ESLint + Sonar rules + security)');
  const lintIssues = await lint();
  done(`${lintIssues.length} finding(s)`);

  step('Secret scan');
  const secretIssues = scanSecrets();
  done(secretIssues.length ? yellow(`${secretIssues.length} finding(s)`) : green('clean'));

  const issues = [...lintIssues, ...secretIssues].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  if (UPDATE_BASELINE) {
    writeBaseline(issues);
    console.log(green(`\nBaseline updated with ${issues.length} accepted finding(s) → ${rel(BASELINE_FILE)}`));
    return;
  }

  step('Dependency audit');
  const au = await audit();
  done(au.skipped ? yellow('skipped') : au.unavailable ? yellow(au.reason) : au.vulns.length ? yellow(`${au.vulns.length} advisory(ies)`) : green('none'));

  step('Tests + coverage');
  const t = tests();
  done(t.skipped ? yellow('skipped') : `${t.total - t.failed.length}/${t.total} passed, coverage ${t.coverage ?? 'n/a'}%`);

  const baseline = loadBaseline() ?? {};
  const fixed = markNew(issues, baseline);
  const newIssues = issues.filter((i) => i.isNew);
  const failOn = new Set(CONFIG.dependencies.failOn);
  const vulns = au.vulns ?? [];
  const blockingVulns = vulns.filter((v) => failOn.has(v.severity) && !v.allowed);
  const coverageOk = t.coverage == null ? null : t.coverage >= CONFIG.coverage.minLinePercent;

  const reasons = [];
  const warnings = [];
  if (tc.ok === false) reasons.push(`${tc.errors.length} TypeScript error(s)`);
  const newBlocking = newIssues.filter((i) => i.severity === 'error' || i.category === 'Security');
  if (newBlocking.length) reasons.push(`${newBlocking.length} new issue(s) (errors or security findings) not in the baseline`);
  if (blockingVulns.length) reasons.push(`${blockingVulns.length} unaccepted ${[...failOn].join('/')} dependency vulnerability(ies)`);
  if (t.failed?.length) reasons.push(`${t.failed.length} failing test(s)`);
  if (coverageOk === false) reasons.push(`line coverage ${t.coverage}% is below ${CONFIG.coverage.minLinePercent}%`);
  if (au.unavailable) warnings.push(`Dependency audit not checked: ${au.reason}`);
  const newWarnings = newIssues.length - newBlocking.length;
  if (newWarnings) warnings.push(`${newWarnings} new warning(s) — not blocking, but please fix`);
  if (fixed) warnings.push(`${fixed} baseline finding(s) fixed — run "npm run quality:baseline" to lock that in`);

  const byCategory = { Security: 0, Reliability: 0, Maintainability: 0 };
  issues.forEach((i) => (byCategory[i.category] += 1));
  const report = {
    generatedAt: new Date().toISOString(),
    passed: reasons.length === 0,
    reasons, warnings, issues, newIssues, fixed, byCategory, vulns,
    blockingVulns: blockingVulns.length, tests: t, coverageOk, typecheck: tc,
  };
  fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
  writeHtml(report);

  console.log('');
  for (const i of newBlocking.slice(0, 30)) console.log(`  ${red('NEW')} ${i.category} ${i.file}:${i.line} ${dim(i.rule)} ${i.message}`);
  if (newBlocking.length > 30) console.log(dim(`  …and ${newBlocking.length - 30} more`));
  for (const v of blockingVulns) console.log(`  ${red('VULN')} ${v.severity} ${v.package}: ${v.title} ${dim(`(${v.fix})`)}`);
  for (const f of t.failed ?? []) console.log(`  ${red('TEST')} ${f.file} › ${f.name}`);
  for (const e of (tc.errors ?? []).slice(0, 20)) console.log(`  ${red('TS')} ${e}`);
  for (const w of warnings) console.log(`  ${yellow('!')} ${w}`);
  console.log(`\n${bold('Quality gate:')} ${report.passed ? green('PASSED') : red('FAILED')}  ${dim(`report → ${rel(path.join(REPORT_DIR, 'index.html'))}`)}`);
  for (const r of reasons) console.log(`  ${red('✗')} ${r}`);
  if (!report.passed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(red(`Quality gate crashed: ${err.stack || err}`));
  process.exitCode = 1;
});
