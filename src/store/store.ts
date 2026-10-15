import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import alertReducer from './alertSlice';
import profileReducer from './profileSlice';
import companyProfileReducer from './companyProfileSlice';

export const store = configureStore({
  reducer: {
    alert: alertReducer,
    profile: profileReducer,
    companyProfile: companyProfileReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
