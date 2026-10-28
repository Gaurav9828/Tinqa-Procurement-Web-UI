import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

/**
 * Keeps the backend free of calls nobody needs, in every environment:
 *  - identical GETs already in flight share one network call (StrictMode's double effect, two components loading
 *    the same data at once);
 *  - a request repeated in a tight loop (an effect that refetches on its own result) is stopped in the browser after
 *    `RUNAWAY_LIMIT` calls in `RUNAWAY_WINDOW_MS`, so one buggy screen cannot flood the API;
 *  - in development every call is counted (window.__TINQA_API_CALLS__) and data fetched again right after it arrived
 *    is reported in the console, so wasteful screens are fixed before they ship.
 */
export const RUNAWAY_LIMIT = 30;
export const RUNAWAY_WINDOW_MS = 10_000;
export const REFETCH_WARN_MS = 1_000;

export const RUNAWAY_ERROR_CODE = 'ERR_RUNAWAY_REQUEST';

const requestKey = (config: InternalAxiosRequestConfig): string =>
  `${(config.method ?? 'get').toUpperCase()} ${axios.getUri(config)}`;

/**
 * Identical GETs that are already in flight share one network call. Nothing is cached once the response lands, so
 * later reads are always fresh. Requests with an abort signal are left alone so one caller cancelling can't cancel
 * the other.
 */
export const dedupeInFlightGets = (adapter: AxiosAdapter): AxiosAdapter => {
  const inFlight = new Map<string, Promise<AxiosResponse>>();

  return (config) => {
    if ((config.method ?? 'get').toLowerCase() !== 'get' || config.signal) return adapter(config);

    // The token is part of the key so two sessions never share a response.
    const key = `${axios.getUri(config)}|${String(config.headers?.Authorization ?? '')}|${config.responseType ?? ''}`;
    const pending = inFlight.get(key);
    if (pending) return pending.then((response) => ({ ...response, config }));

    const request = adapter(config).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };
};

/** Refuses a request sent more than `limit` times within `windowMs` (a render or effect loop), without calling the server. */
export const stopRunawayRequests = (
  adapter: AxiosAdapter,
  limit = RUNAWAY_LIMIT,
  windowMs = RUNAWAY_WINDOW_MS,
  now: () => number = Date.now
): AxiosAdapter => {
  const recent = new Map<string, number[]>();

  return (config) => {
    const key = requestKey(config);
    const at = now();
    const times = (recent.get(key) ?? []).filter((t) => at - t < windowMs);
    times.push(at);
    recent.set(key, times);
    if (times.length > limit) {
      const message = `Stopped ${key}: sent ${times.length} times in ${windowMs / 1000}s (request loop)`;
      console.error(`[API guard] ${message}`);
      return Promise.reject(new AxiosError(message, RUNAWAY_ERROR_CODE, config));
    }
    return adapter(config);
  };
};

export interface ApiCallStats {
  total: number;
  byEndpoint: Record<string, number>;
  refetchedTooSoon: Record<string, number>;
}

declare global {
  interface Window {
    __TINQA_API_CALLS__?: ApiCallStats;
  }
}

/** Development only: counts every call and warns when a GET is fetched again within `REFETCH_WARN_MS` of its answer. */
export const monitorCalls = (adapter: AxiosAdapter, label: string, now: () => number = Date.now): AxiosAdapter => {
  const stats: ApiCallStats = { total: 0, byEndpoint: {}, refetchedTooSoon: {} };
  const answeredAt = new Map<string, number>();
  if (typeof window !== 'undefined') window.__TINQA_API_CALLS__ = stats;

  return (config) => {
    const key = requestKey(config);
    stats.total += 1;
    stats.byEndpoint[key] = (stats.byEndpoint[key] ?? 0) + 1;
    const last = answeredAt.get(key);
    if (key.startsWith('GET ') && last !== undefined && now() - last < REFETCH_WARN_MS) {
      stats.refetchedTooSoon[key] = (stats.refetchedTooSoon[key] ?? 0) + 1;
      console.warn(`[${label}] ${key} fetched again ${now() - last} ms after it arrived: reuse the data (or check the effect's dependencies)`);
    }
    return adapter(config).finally(() => answeredAt.set(key, now()));
  };
};

/** The guards in the order they run: count (dev), stop loops, then share in-flight GETs. */
export const guardAdapter = (adapter: AxiosAdapter, label: string, dev = import.meta.env.DEV): AxiosAdapter => {
  const guarded = stopRunawayRequests(dedupeInFlightGets(adapter));
  return dev ? monitorCalls(guarded, label) : guarded;
};
