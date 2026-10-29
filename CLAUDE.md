# TinQa Procurement Web UI

Before any change, read `docs/engineering-rules.md` and follow its checklist. These rules are shared by all four
TinQa services; change every copy together. Optimization work is tracked in `docs/optimization-roadmap.md`; update a
phase's status when you finish it.

Specific to this app:
- Gate every load by its endpoint's permission (`useAccess().can`), and keep `src/config/endpointAccess.ts` in step
  with the backends.
- Approvals Hub badges come from `features/approvals/hooks/useApprovalSummary.ts`. Its queue permissions in
  `services/approvalSummaryApi.ts` mirror both backends' `ApprovalQueue` enums. Tab lists load only while their tab
  is open (`enabled`).
- API-call budgets per page: `quality-gate.config.json`. Every endpoint a page calls needs a fixture in
  `e2e/support/fixtures.ts`.
- E2E runs against the built bundle: run `vite build`, then `npx playwright test`, then `node scripts/e2e-gate.mjs`.
- Behaviour users notice also updates `src/features/user-guide/content/guideContent.ts` (its changelog and version).
