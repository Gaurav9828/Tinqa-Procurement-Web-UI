import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** 'alert' renders the amber warning style. */
export type AlertType = 'error' | 'success' | 'alert';

interface AlertState {
  /** Increments on every showAlert so a repeated identical message still re-displays. */
  id: number;
  message: string | null;
  type: AlertType;
  duration: number;
  isOpen: boolean;
}

const initialState: AlertState = {
  id: 0,
  message: null,
  type: 'success',
  duration: 5000,
  isOpen: false,
};

interface ShowAlertPayload {
  message: string;
  type?: AlertType;
  duration?: number;
}

const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    showAlert: (state, action: PayloadAction<ShowAlertPayload>) => {
      state.id += 1;
      state.message = action.payload.message;
      state.type = action.payload.type || 'success';
      state.duration = action.payload.duration || 5000;
      state.isOpen = true;
    },
    hideAlert: (state) => {
      state.message = null;
      state.isOpen = false;
    },
  },
});

export const { showAlert, hideAlert } = alertSlice.actions;
export default alertSlice.reducer;
