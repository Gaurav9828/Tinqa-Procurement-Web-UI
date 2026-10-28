import axios, { type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dedupeInFlightGets,
  guardAdapter,
  monitorCalls,
  RUNAWAY_ERROR_CODE,
  stopRunawayRequests,
} from './apiCallGuard';

const ok = (config: InternalAxiosRequestConfig): AxiosResponse => ({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });

/** An adapter that answers when `release()` is called, counting the network calls it receives. */
const deferredAdapter = () => {
  const calls: InternalAxiosRequestConfig[] = [];
  const pending: (() => void)[] = [];
  const adapter: AxiosAdapter = (config) =>
    new Promise((resolve) => {
      calls.push(config);
      pending.push(() => resolve(ok(config)));
    });
  return { adapter, calls, release: () => pending.splice(0).forEach((r) => r()) };
};

const client = (adapter: AxiosAdapter) => axios.create({ baseURL: 'http://api.test', adapter });

afterEach(() => {
  delete window.__TINQA_API_CALLS__;
});

describe('dedupeInFlightGets', () => {
  it('sends identical in-flight GETs once and gives every caller the answer', async () => {
    const net = deferredAdapter();
    const api = client(dedupeInFlightGets(net.adapter));
    const both = Promise.all([api.get('/products/active'), api.get('/products/active')]);
    net.release();
    const [a, b] = await both;
    expect(net.calls).toHaveLength(1);
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
  });

  it('fetches again once the first answer has arrived (nothing is cached)', async () => {
    const net = deferredAdapter();
    const api = client(dedupeInFlightGets(net.adapter));
    const first = api.get('/cart');
    net.release();
    await first;
    const second = api.get('/cart');
    net.release();
    await second;
    expect(net.calls).toHaveLength(2);
  });

  it('never shares writes, cancellable requests or different sessions', async () => {
    const net = deferredAdapter();
    const api = client(dedupeInFlightGets(net.adapter));
    const all = Promise.all([
      api.post('/cart/add'),
      api.post('/cart/add'),
      api.get('/orders', { signal: new AbortController().signal }),
      api.get('/orders', { signal: new AbortController().signal }),
      api.get('/auth/me', { headers: { Authorization: 'Bearer a' } }),
      api.get('/auth/me', { headers: { Authorization: 'Bearer b' } }),
    ]);
    net.release();
    await all;
    expect(net.calls).toHaveLength(6);
  });
});

describe('stopRunawayRequests', () => {
  it('stops a request repeated beyond the limit within the window, without calling the server', async () => {
    let clock = 0;
    const adapter = vi.fn<AxiosAdapter>(async (config) => ok(config));
    const api = client(stopRunawayRequests(adapter, 3, 1000, () => clock));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    for (let i = 0; i < 3; i++) await api.get('/orders');
    await expect(api.get('/orders')).rejects.toMatchObject({ code: RUNAWAY_ERROR_CODE });
    expect(adapter).toHaveBeenCalledTimes(3);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('GET http://api.test/orders'));

    // Other requests are unaffected, and the same one is allowed again once the window has passed
    await api.get('/cart');
    clock = 1500;
    await api.get('/orders');
    expect(adapter).toHaveBeenCalledTimes(5);
  });
});

describe('monitorCalls', () => {
  it('counts every call and warns when a GET is fetched again right after it arrived', async () => {
    let clock = 0;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const api = client(monitorCalls(async (config) => ok(config), 'Test API', () => clock));

    await api.get('/products/active');
    clock = 200;
    await api.get('/products/active');
    clock = 5000;
    await api.get('/products/active');
    await api.post('/cart/add');

    expect(window.__TINQA_API_CALLS__).toEqual({
      total: 4,
      byEndpoint: { 'GET http://api.test/products/active': 3, 'POST http://api.test/cart/add': 1 },
      refetchedTooSoon: { 'GET http://api.test/products/active': 1 },
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('fetched again 200 ms after it arrived'));
  });
});

describe('guardAdapter', () => {
  it('counts calls in development only', async () => {
    await client(guardAdapter(async (config) => ok(config), 'Test API', false)).get('/a');
    expect(window.__TINQA_API_CALLS__).toBeUndefined();

    await client(guardAdapter(async (config) => ok(config), 'Test API', true)).get('/a');
    expect(window.__TINQA_API_CALLS__?.total).toBe(1);
  });
});
