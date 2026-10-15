import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { companyProfileApi } from '../features/company-profile/api/companyProfileApi';
import type { CompanyProfileOverview } from '../features/company-profile/types/companyProfile.types';
import { getApiErrorKind, type ApiErrorKind } from '../utils/apiErrorKind';

/** A non-forced load within this window reuses the stored overview instead of calling the API again. */
export const COMPANY_OVERVIEW_FRESH_MS = 30_000;

interface CompanyProfileState {
  overview: CompanyProfileOverview | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  errorKind: ApiErrorKind | null;
  fetchedAt: number;
}

const initialState: CompanyProfileState = { overview: null, status: 'idle', errorKind: null, fetchedAt: 0 };

/**
 * GET /admin/company/profile — shared by the navigation badge and every company profile page, so they
 * never each fetch the same data. Skipped while a request is in flight, and (unless `force`) while the
 * stored overview is still fresh. Pass `{ force: true }` after a change or for an explicit refresh.
 */
export const fetchCompanyOverview = createAsyncThunk<
  CompanyProfileOverview,
  { force?: boolean } | undefined,
  { state: { companyProfile: CompanyProfileState }; rejectValue: ApiErrorKind }
>(
  'companyProfile/fetchOverview',
  async (_arg, { rejectWithValue }) => {
    try {
      const res = await companyProfileApi.getOverview();
      return res.success && res.data ? res.data : rejectWithValue('unknown');
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorKind(err));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status, fetchedAt } = getState().companyProfile;
      if (status === 'loading') return false;
      if (arg?.force) return true;
      return !(status === 'succeeded' && Date.now() - fetchedAt < COMPANY_OVERVIEW_FRESH_MS);
    },
  }
);

const companyProfileSlice = createSlice({
  name: 'companyProfile',
  initialState,
  reducers: {
    clearCompanyProfile: () => initialState,
    /** The overview is out of date (a change was made): the next load fetches even within the fresh window. */
    invalidateCompanyOverview: (state) => {
      state.fetchedAt = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanyOverview.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCompanyOverview.fulfilled, (state, action) => {
        state.overview = action.payload;
        state.status = 'succeeded';
        state.errorKind = null;
        state.fetchedAt = Date.now();
      })
      .addCase(fetchCompanyOverview.rejected, (state, action) => {
        const kind = action.payload ?? 'unknown';
        // Keep the last data on a transient failure of a reload; drop it when it's gone or forbidden.
        const keep = !!state.overview && kind !== 'notFound' && kind !== 'forbidden';
        state.status = 'failed';
        state.fetchedAt = 0;
        state.overview = keep ? state.overview : null;
        state.errorKind = keep ? null : kind;
      });
  },
});

export const { clearCompanyProfile, invalidateCompanyOverview } = companyProfileSlice.actions;
export default companyProfileSlice.reducer;
