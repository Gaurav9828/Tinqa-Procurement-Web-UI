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

test('Careers opens on its openings with three calls of its own', async ({ page, backend }) => {
  await backend.signInAsSuperAdmin();
  await page.goto('/careers');
  await expect(page.getByRole('heading', { name: 'Careers' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Openings' })).toContainText('No openings yet.');
  await page.waitForLoadState('networkidle');

  const careers = backend.network.api.filter((c) => c.path.startsWith('/admin/careers'));
  expect(careers.map((c) => c.path.split('?')[0]).sort()).toEqual(['/admin/careers/categories', '/admin/careers/openings', '/admin/careers/settings']);
  await expect(page.getByRole('region', { name: 'Careers tab on the website' })).toContainText('Shown');
});

test('the Approvals Hub loads no careers list until its Careers tab is opened', async ({ page, backend }) => {
  await backend.signInAsSuperAdmin();
  await page.goto('/approvals');
  await expect(page.getByRole('tab', { name: /Careers/ })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(backend.network.api.filter((c) => c.path.startsWith('/admin/careers'))).toEqual([]);
});

test('Client Demos & Meetings loads no meeting list until its Meetings tab is opened', async ({ page, backend }) => {
  await backend.signInAsSuperAdmin();
  await page.goto('/client-demos');
  await expect(page.getByRole('tab', { name: 'Meetings' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(backend.network.api.filter((c) => c.path.split('?')[0] === '/v1/meetings')).toEqual([]);

  await page.getByRole('tab', { name: 'Meetings' }).click();
  await expect(page.getByRole('region', { name: 'Meetings' })).toContainText('No meetings match.');
  expect(backend.network.api.filter((c) => c.path.split('?')[0] === '/v1/meetings')).toHaveLength(1);
});

test('Promo Codes lists the codes with one call, and asks for a code suggestion only when the create form opens', async ({ page, backend }) => {
  await backend.signInAsSuperAdmin();
  await page.goto('/promo-codes');
  await expect(page.getByRole('heading', { name: 'Promo Codes' })).toBeVisible();
  await expect(page.getByText('No promo codes yet.')).toBeVisible();
  await page.waitForLoadState('networkidle');
  const promo = () => backend.network.api.filter((c) => c.path.startsWith('/admin/promo-codes')).map((c) => c.path.split('?')[0]);
  expect(promo()).toEqual(['/admin/promo-codes']);

  await page.getByRole('button', { name: 'New promo code' }).click();
  const dialog = page.getByRole('dialog', { name: 'New promo code' });
  await expect(dialog.getByLabel('Code', { exact: true })).toHaveValue('TINQA7KQ3MZP');
  expect(promo()).toEqual(['/admin/promo-codes', '/admin/promo-codes/code-suggestion']);
});
