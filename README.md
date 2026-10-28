

npm install lucide-react clsx tailwind-merge zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

file tree: tree -I node_modules
## Quality gate

`npm run build` (strict, prod) and `npm run build:dev` first run [scripts/quality-gate.mjs](scripts/quality-gate.mjs), a free local
replacement for SonarQube. It type-checks, runs ESLint with Sonar's open-source rules plus security/XSS rules,
scans for committed secrets, checks dependencies against the OSV.dev vulnerability database and runs the tests with coverage. The build stops when any of these is true:

- a new error or security finding that is not in `quality-gate.baseline.json`
- a committed secret
- a high or critical dependency vulnerability that isn't accepted in `quality-gate.config.json`
- a failing test
- line coverage below the configured minimum

**Dev and strict.** Build scripts pass a mode. `dev` stops only on the items above and reports the rest as warnings:
new warnings, moderate vulnerabilities, a dependency check that could not run, and new-code coverage (the lines changed
since the base branch that the tests run) below `coverage.minNewCodePercent`. `uat` and `prod` are strict: every one of
those fails the build too. `npm run dev` first runs a quick check (lint, secrets, the tests of changed files) that
reports but never blocks.

**Unit tests never reach a server**: an API call nobody mocked fails the test that made it (`src/test/setup.ts`).

**After the build**, [scripts/e2e-gate.mjs](scripts/e2e-gate.mjs) tests the built bundle in Chromium (Playwright,
`e2e/`, backends mocked from `e2e/support/`): every page in `src/App.tsx` must load without errors, the main
journeys must work, and each page's API calls are checked: no GET sent twice while a page loads, no call without a
fixture, nothing sent to hosts outside the app and its API, at most `e2e.maxApiCallsPerPage` calls. The bundle's
gzip size is held to `bundle` in `quality-gate.config.json`. Budgets warn in dev and fail strict builds; failing
tests fail every build. Run it alone with `npm run test:e2e` (first time: `npx playwright install chromium`).

The HTML report is written to `reports/quality/index.html`; the end-to-end summary to `reports/quality/e2e.json`.

- After fixing old findings: `npm run quality:baseline` (commit the updated baseline).
- Offline: `QG_SKIP=audit npm run build` (also accepts `tests`, `typecheck`, `e2e`); strict builds fail on skipped checks.
- Run every push through the dev build first (opt-in, once per clone): `git config core.hooksPath .githooks`.
