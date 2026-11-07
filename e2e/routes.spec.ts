import { readFileSync } from 'node:fs';
import { expect, test } from './support/test';

/**
 * Every page of the admin app, read from src/App.tsx so a new route is tested the day it is added: it must load
 * without errors for the account it is meant for, and its network record goes to the call-budget check
 * (scripts/e2e-gate.mjs).
 */
const SAMPLE_PARAMS: Record<string, string> = {
  id: '1',
  orderId: '1',
  document: 'quotation',
  orderNumber: 'ORD-1001',
  customerId: '1',
  referenceNumber: 'TQ-Q-000001',
};
const PUBLIC = new Set(['/login', '/forgot-password', '/set-password', '/error']);

const accountFor = (path: string): AppRoute['account'] => {
  if (PUBLIC.has(path)) return 'none';
  return path.startsWith('/supplier/') ? 'supplier' : 'super admin';
};

interface AppRoute {
  path: string;
  url: string;
  account: 'none' | 'super admin' | 'supplier';
}

const discoverRoutes = (): AppRoute[] =>
  [...readFileSync('src/App.tsx', 'utf8').matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => (m[1].startsWith('/') ? m[1] : `/${m[1]}`))
    .filter((p) => p !== '/*')
    .map((p) => ({
      path: p,
      url: p.replace(/:(\w+)/g, (_, name: string) => {
        if (!SAMPLE_PARAMS[name]) throw new Error(`Route ${p}: add a sample value for :${name} to SAMPLE_PARAMS in e2e/routes.spec.ts`);
        return SAMPLE_PARAMS[name];
      }),
      account: accountFor(p),
    }));

const routes = discoverRoutes();

test('the route list was found', () => {
  expect(routes.length).toBeGreaterThan(20);
});

for (const route of routes) {
  const forWhom = route.account === 'none' ? '' : ' for a ' + route.account;
  test(`${route.path} loads cleanly${forWhom}`, async ({ page, backend }) => {
    if (route.account === 'super admin') await backend.signInAsSuperAdmin();
    if (route.account === 'supplier') await backend.signInAsSupplier();
    const response = await page.goto(route.url);
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).not.toBeEmpty();
    if (route.account !== 'none') await expect(page).not.toHaveURL(/\/login/);
    if (route.path !== '/error') {
      await expect(page).not.toHaveURL(/\/error/);
      await expect(page.getByRole('heading', { name: /Something went wrong|Connection problem/i })).toHaveCount(0);
    }
  });
}

test('a signed-out visitor is sent to sign in', async ({ page, backend }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login/);
  expect(backend.network.api.filter((c) => c.path.startsWith('/v1/'))).toEqual([]);
});
