

npm install lucide-react clsx tailwind-merge zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

file tree: tree -I node_modules
## Quality gate

`npm run build` first runs `npm run quality` ([scripts/quality-gate.mjs](scripts/quality-gate.mjs)), a free local
replacement for SonarQube. It type-checks, runs ESLint with Sonar's open-source rules plus security/XSS rules,
scans for committed secrets, checks dependencies against the OSV.dev vulnerability database and runs the tests with coverage. The build stops when any of these is true:

- a new error or security finding that is not in `quality-gate.baseline.json`
- a committed secret
- a high or critical dependency vulnerability that isn't accepted in `quality-gate.config.json`
- a failing test
- line coverage below the configured minimum

The HTML report is written to `reports/quality/index.html`.

- After fixing old findings: `npm run quality:baseline` (commit the updated baseline).
- Offline: `QG_SKIP=audit npm run build` (also accepts `tests`, `typecheck`).
