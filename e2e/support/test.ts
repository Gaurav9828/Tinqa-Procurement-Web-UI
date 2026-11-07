import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test as base, expect, type Page, type Route } from '@playwright/test';
import { SUPPLIER_SESSION, e2eToken, handlers, SUPER_ADMIN_SESSION, type Session } from './fixtures';

/**
 * The admin web app against mocked backends (Procurement and E-commerce). Every request the page makes is recorded:
 *  - API calls (any URL with /api/ outside the app's own origin) are answered from fixtures (./fixtures.ts);
 *  - anything else outside the app's origin is blocked and reported (no third-party calls slip in unnoticed);
 *  - uncaught page errors, console errors and failed requests fail the test.
 * Each test writes its network record to reports/e2e/network/, where scripts/e2e-gate.mjs checks the call budgets.
 */
export interface ApiCall {
  method: string;
  path: string;
  status: number;
  mocked: boolean;
}

export interface Network {
  api: ApiCall[];
  external: string[];
}

const corsHeaders = (origin: string) => ({
  'access-control-allow-origin': origin,
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
});

/** Allowed hosts outside the app (none yet: the admin app talks only to its two APIs). */
const ALLOWED_EXTERNAL_HOSTS = new Set<string>([]);

async function mockBackends(page: Page, appOrigin: string, network: Network, session: () => Session): Promise<void> {
  const app = new URL(appOrigin);
  await page.route('**/*', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.host === app.host || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();

    const apiAt = url.pathname.indexOf('/api/');
    if (apiAt === -1) {
      if (ALLOWED_EXTERNAL_HOSTS.has(url.host)) return route.continue();
      network.external.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    }

    const origin = request.headers()['origin'] ?? appOrigin;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders(origin) });

    const apiPath = url.pathname.slice(apiAt + 4);
    const entry = handlers(session()).find(([method, re]) => method === request.method() && re.test(apiPath));
    const answer = entry
      ? entry[2](apiPath.match(entry[1]) as RegExpMatchArray, url)
      : { status: 501, errorCode: 'NO_E2E_FIXTURE' };
    network.api.push({ method: request.method(), path: apiPath + url.search, status: answer.status, mocked: Boolean(entry) });
    const success = answer.status < 400;
    return route.fulfill({
      status: answer.status,
      headers: corsHeaders(origin),
      contentType: 'application/json',
      body: JSON.stringify(
        answer.raw ?? { success, message: success ? 'OK' : 'Request failed', errorCode: answer.errorCode ?? null, data: answer.data ?? null }
      ),
    });
  });
}

/** Puts a session into the app's storage before its scripts run, as signing in would. */
async function seedSession(page: Page, session: Session): Promise<void> {
  const token = e2eToken(session.user.username);
  await page.addInitScript(
    ([t, user]) => {
      localStorage.setItem('tinqa.auth.token', t);
      localStorage.setItem('tinqa.auth.expiry', String(4_102_444_800_000));
      localStorage.setItem('tinqa.auth.user', user);
    },
    [token, JSON.stringify(session.user)] as const
  );
}

interface Fixtures {
  backend: { network: Network; signInAsSuperAdmin: () => Promise<void>; signInAsSupplier: () => Promise<void> };
}

const REPORT_DIR = path.join(process.cwd(), 'reports', 'e2e', 'network');

export const test = base.extend<Fixtures>({
  // Automatic: no test can reach a real backend, whether or not it asks for the fixture
  backend: [
    async ({ page, baseURL }, use, testInfo) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`Uncaught error: ${error.message}`));
      page.on('console', (message) => {
        // The browser's own note about a 4xx answer or a blocked request is not an application error
        if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) problems.push(`Console error: ${message.text()}`);
      });
      page.on('requestfailed', (request) => {
        if (request.failure()?.errorText !== 'net::ERR_BLOCKED_BY_CLIENT') problems.push(`Request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText})`);
      });

      const network: Network = { api: [], external: [] };
      let session = SUPER_ADMIN_SESSION;
      await mockBackends(page, baseURL as string, network, () => session);
      await use({
        network,
        signInAsSuperAdmin: () => {
          session = SUPER_ADMIN_SESSION;
          return seedSession(page, session);
        },
        signInAsSupplier: () => {
          session = SUPPLIER_SESSION;
          return seedSession(page, session);
        },
      });

      mkdirSync(REPORT_DIR, { recursive: true });
      writeFileSync(
        path.join(REPORT_DIR, `${testInfo.testId}.json`),
        JSON.stringify({ test: testInfo.titlePath.slice(1).join(' › '), page: new URL(page.url()).pathname, ...network }, null, 2)
      );
      expect(problems, 'The page must run without uncaught errors, console errors or failed requests').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
