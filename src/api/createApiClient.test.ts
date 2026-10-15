import { describe, expect, it } from 'vitest';
import axios, { type AxiosAdapter } from 'axios';
import { dedupeInFlightGets } from './createApiClient';

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
