import { configureStore } from '@reduxjs/toolkit';
import alertReducer from './alertSlice';

export const store = configureStore({
  reducer: {
    alert: alertReducer,
    // Add other slices here if needed
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;