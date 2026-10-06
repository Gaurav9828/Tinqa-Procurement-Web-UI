import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { showAlert } from '../store/alertSlice';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * The app's single feedback channel. Hooks report API outcomes here directly,
 * so pages and modals never need error/success props drilled into them.
 *
 *   const notify = useNotify();
 *   notify.success(res.message || 'Saved.');
 *   notify.error(err, 'Failed to save.');   // accepts a thrown error or a string
 */
export const useNotify = () => {
  const dispatch = useDispatch();

  return useMemo(
    () => ({
      success: (message: string) => dispatch(showAlert({ message, type: 'success' })),
      warning: (message: string) => dispatch(showAlert({ message, type: 'alert' })),
      error: (errOrMessage: unknown, fallback = 'Something went wrong. Please try again.') => {
        // Cancelled requests (e.g. expired session → redirect) are not user-facing errors.
        if (axios.isCancel(errOrMessage)) return;
        dispatch(
          showAlert({
            message: typeof errOrMessage === 'string' ? errOrMessage : getApiErrorMessage(errOrMessage, fallback),
            type: 'error',
          })
        );
      },
    }),
    [dispatch]
  );
};

export type Notify = ReturnType<typeof useNotify>;
