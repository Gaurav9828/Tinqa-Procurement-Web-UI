import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** 'alert' renders the amber warning style. */
export type AlertType = 'error' | 'success' | 'alert';

export interface AlertItem {
  /** Unique per alert, so the same text shown twice still appears twice. */
  id: number;
  message: string;
  type: AlertType;
  duration: number;
}

interface AlertState {
  nextId: number;
  /** Visible alerts, newest first. Each one is a separate section with its own close button / timer. */
  alerts: AlertItem[];
}

/** More than this and the oldest alerts are dropped. */
export const MAX_VISIBLE_ALERTS = 6;
const DEFAULT_DURATION = 5000;

const initialState: AlertState = { nextId: 1, alerts: [] };

interface ShowAlertPayload {
  message: string;
  type?: AlertType;
  duration?: number;
}

interface ShowAlertsPayload {
  /** One alert per message (e.g. one per field error from the server). */
  messages: string[];
  type?: AlertType;
  duration?: number;
}

const push = (state: AlertState, message: string, type: AlertType, duration: number) => {
  state.alerts.unshift({ id: state.nextId++, message, type, duration });
  if (state.alerts.length > MAX_VISIBLE_ALERTS) state.alerts.length = MAX_VISIBLE_ALERTS;
};

const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    showAlert: (state, action: PayloadAction<ShowAlertPayload>) => {
      const { message, type = 'success', duration = DEFAULT_DURATION } = action.payload;
      if (message.trim()) push(state, message, type, duration);
    },
    showAlerts: (state, action: PayloadAction<ShowAlertsPayload>) => {
      const { messages, type = 'error', duration = DEFAULT_DURATION } = action.payload;
      // Pushed in reverse so the list reads in server order, top to bottom.
      [...messages].reverse().forEach((message) => {
        if (message.trim()) push(state, message, type, duration);
      });
    },
    dismissAlert: (state, action: PayloadAction<number>) => {
      state.alerts = state.alerts.filter((alert) => alert.id !== action.payload);
    },
    clearAlerts: (state) => {
      state.alerts = [];
    },
  },
});

export const { showAlert, showAlerts, dismissAlert, clearAlerts } = alertSlice.actions;
export default alertSlice.reducer;
