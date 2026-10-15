import { describe, expect, it, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import companyProfileReducer, { COMPANY_OVERVIEW_FRESH_MS, fetchCompanyOverview, invalidateCompanyOverview } from './companyProfileSlice';
import { companyProfileApi } from '../features/company-profile/api/companyProfileApi';

vi.mock('../features/company-profile/api/companyProfileApi', () => ({ companyProfileApi: { getOverview: vi.fn() } }));
const getOverview = vi.mocked(companyProfileApi.getOverview);

const makeStore = () => configureStore({ reducer: { companyProfile: companyProfileReducer } });

beforeEach(() => {
  getOverview.mockReset();
  getOverview.mockResolvedValue({ success: true, data: { live: null, pending: null, myDrafts: [] } } as never);
});

describe('fetchCompanyOverview', () => {
  it('sends one request for concurrent callers (navigation badge + page, StrictMode)', async () => {
    const store = makeStore();
    await Promise.all([store.dispatch(fetchCompanyOverview()), store.dispatch(fetchCompanyOverview()), store.dispatch(fetchCompanyOverview())]);
    expect(getOverview).toHaveBeenCalledTimes(1);
  });

  it('reuses a fresh overview on revisit / focus, and refetches once stale', async () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      await store.dispatch(fetchCompanyOverview());
      await store.dispatch(fetchCompanyOverview());
      expect(getOverview).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(COMPANY_OVERVIEW_FRESH_MS + 1);
      await store.dispatch(fetchCompanyOverview());
      expect(getOverview).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refetches immediately when forced or after a change invalidates it', async () => {
    const store = makeStore();
    await store.dispatch(fetchCompanyOverview());
    await store.dispatch(fetchCompanyOverview({ force: true }));
    expect(getOverview).toHaveBeenCalledTimes(2);

    store.dispatch(invalidateCompanyOverview());
    await store.dispatch(fetchCompanyOverview());
    expect(getOverview).toHaveBeenCalledTimes(3);
  });
});
