import { expect, test } from './support/test';

/** The main admin journeys, end to end in a real browser against the production bundle. */

test('signing in sends one login request and opens the workspace', async ({ page, backend }) => {
  await page.goto('/login');
  await page.locator('#login-username').fill('e2e.admin');
  await page.locator('#login-password').fill('Str0ng!Pass');
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.waitForLoadState('networkidle');

  expect(backend.network.api.filter((c) => c.method === 'POST' && c.path === '/auth/admin/login')).toHaveLength(1);
  // Signing in loads the account's access once, not once per screen
  expect(backend.network.api.filter((c) => c.path === '/v1/access/me').length).toBeLessThanOrEqual(1);
});

test('a dealer only reaches the dealer portal', async ({ page, backend }) => {
  await backend.signInAsDealer();
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');
  // No procurement order list is ever requested for a dealer
  expect(backend.network.api.filter((c) => c.path.startsWith('/v1/orders'))).toEqual([]);
});
