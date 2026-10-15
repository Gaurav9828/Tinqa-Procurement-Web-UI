import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { authService } from '../api/services/authService';
import { getApiErrorMessages } from '../utils/apiError';
import { showAlerts } from './alertSlice';
import type { AdminProfile } from '../types/auth';

export interface ProfileFormState {
  username: string;
  email: string;
  employee_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  display_name: string;
  date_of_birth: string;
  gender: string;
  designation: string;
  /** Read-only: the designation decides access and is changed by an administrator in Employee Management. */
  designation_label: string;
  department: string;
  employment_type: string;
  joining_date: string;
  phone: string;
  alternate_phone: string;
  personal_email: string;
  status: string;
}

type ProfileStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ProfileState {
  data: ProfileFormState | null;
  status: ProfileStatus;
}

const initialState: ProfileState = { data: null, status: 'idle' };

interface ApiResponseEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

const toFormState = (profile: AdminProfile): ProfileFormState => ({
  username: profile.username || '',
  email: profile.workEmail || '',
  employee_code: profile.employeeCode || '',
  first_name: profile.firstName || '',
  middle_name: profile.middleName || '',
  last_name: profile.lastName || '',
  display_name: profile.displayName || '',
  date_of_birth: profile.dateOfBirth || '',
  gender: profile.gender || 'MALE',
  designation: profile.designation || '',
  designation_label: profile.designationLabel || profile.designation || '',
  department: profile.department || '',
  employment_type: profile.employmentType || '',
  joining_date: profile.joiningDate || '',
  phone: profile.primaryPhone || '',
  alternate_phone: profile.alternatePhone || '',
  personal_email: profile.personalEmail || '',
  status: profile.status || 'ACTIVE',
});

/**
 * Loads the signed-in admin's profile once per session. Later calls (page revisits, StrictMode's
 * double effect) are skipped while a request is in flight or the profile is already loaded;
 * pass `{ force: true }` to refetch.
 */
export const fetchProfile = createAsyncThunk<
  ProfileFormState,
  { force?: boolean } | undefined,
  { state: { profile: ProfileState } }
>(
  'profile/fetch',
  async (_arg, { dispatch, rejectWithValue }) => {
    try {
      const rawResponse = await authService.getProfile();
      const envelope = rawResponse as ApiResponseEnvelope<AdminProfile> & AdminProfile;
      return toFormState(envelope.data || envelope);
    } catch (err: unknown) {
      // Cancelled requests (e.g. expired session → redirect) are not user-facing errors.
      if (!axios.isCancel(err)) {
        dispatch(showAlerts({ messages: getApiErrorMessages(err, 'Failed to load profile details.'), type: 'error' }));
      }
      return rejectWithValue(null);
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = getState().profile;
      if (status === 'loading') return false;
      return Boolean(arg?.force) || status !== 'succeeded';
    },
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    /** Keeps the cache in step after a successful save, so no refetch is needed. */
    profileSaved: (state, action: PayloadAction<ProfileFormState>) => {
      state.data = action.payload;
      state.status = 'succeeded';
    },
    clearProfile: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export const { profileSaved, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
