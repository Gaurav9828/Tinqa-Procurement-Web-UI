import { afterEach, describe, expect, it, vi } from 'vitest';
import axios, { type AxiosAdapter } from 'axios';
import { createApiClient, dedupeInFlightGets } from './createApiClient';
import { ECOMMERCE_ENDPOINTS } from '../config/endpointAccess';
import { clearSession, saveUser } from '../auth/session';

describe('dedupeInFlightGets', () => {
  it('shares one call between identical concurrent GETs, but not across params, methods or later reads', async () => {
    const calls: string[] = [];
    const fakeAdapter: AxiosAdapter = (config) => {
      calls.push(`${config.method} ${axios.getUri(config)}`);
      return new Promise((resolve) =>
        setTimeout(() => resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }), 5)
      );
    };
    const client = axios.create({ baseURL: 'http://api.test', adapter: dedupeInFlightGets(fakeAdapter) });

    const [a, b] = await Promise.all([client.get('/v1/admin/profile'), client.get('/v1/admin/profile')]);
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    expect(calls).toHaveLength(1);

    await Promise.all([client.get('/items', { params: { page: 0 } }), client.get('/items', { params: { page: 1 } })]);
    await Promise.all([client.post('/items', {}), client.post('/items', {})]);
    await client.get('/v1/admin/profile');

    expect(calls).toEqual([
      'get http://api.test/v1/admin/profile',
      'get http://api.test/items?page=0',
      'get http://api.test/items?page=1',
      'post http://api.test/items',
      'post http://api.test/items',
      'get http://api.test/v1/admin/profile',
    ]);
  });

  it('does not share requests that carry their own abort signal', async () => {
    let count = 0;
    const fakeAdapter: AxiosAdapter = (config) => {
      count += 1;
      return Promise.resolve({ data: null, status: 200, statusText: 'OK', headers: {}, config });
    };
    const client = axios.create({ adapter: dedupeInFlightGets(fakeAdapter) });
    const controller = new AbortController();
    await Promise.all([client.get('/x', { signal: controller.signal }), client.get('/x', { signal: controller.signal })]);
    expect(count).toBe(2);
  });
});

describe('permission guard', () => {
  const clientWithFakeNetwork = () => {
    const sent: string[] = [];
    const client = createApiClient('http://api.test/api', 'Test API', ECOMMERCE_ENDPOINTS);
    client.defaults.adapter = (config) => {
      sent.push(`${config.method} ${config.url}`);
      return Promise.resolve({ data: { success: true }, status: 200, statusText: 'OK', headers: {}, config });
    };
    return { client, sent };
  };
  const signInWith = (permissions?: string[]) =>
    saveUser({ userId: 1, username: 'u', email: 'u@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions });

  afterEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('never sends a request the user lacks the permission for, and cancels it silently', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    signInWith(['CUSTOMER_ORDER_VIEW', 'DELIVERY_STATUS_UPDATE']);
    const { client, sent } = clientWithFakeNetwork();

    const refunds = client.get('/admin/orders/ORD-1/refunds');
    await expect(refunds).rejects.toSatisfy((err: unknown) => axios.isCancel(err));
    await expect(client.patch('/orders/ORD-1/tracking', { status: 'PACKED' })).rejects.toSatisfy((err: unknown) => axios.isCancel(err));

    await client.get('/admin/orders/ORD-1');
    await client.patch('/orders/ORD-1/delivery-status', { status: 'DELIVERED' });
    expect(sent).toEqual(['get /admin/orders/ORD-1', 'patch /orders/ORD-1/delivery-status']);
  });

  it('sends endpoints without a fixed permission, and everything while permissions are not loaded yet', async () => {
    signInWith([]);
    const { client, sent } = clientWithFakeNetwork();
    await client.get('/products/12');

    signInWith(undefined);
    await client.get('/admin/refunds');
    expect(sent).toEqual(['get /products/12', 'get /admin/refunds']);
  });
});
