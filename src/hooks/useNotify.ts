import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { showAlert, showAlerts } from '../store/alertSlice';
import { getApiErrorMessages } from '../utils/apiError';

/**
 * The app's single feedback channel. Hooks report API outcomes here directly,
 * so pages and modals never need error/success props drilled into them.
 *
 *   const notify = useNotify();
 *   notify.success(res.message || 'Saved.');
 *   notify.error(err, 'Failed to save.');   // a thrown error, a `success: false` response, or a string
 *
 * Errors follow the backend envelope ({ message, errors: [{ field, message }] }): every field error
 * gets its own alert; without field errors the envelope's `message` is shown.
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
        const messages =
          typeof errOrMessage === 'string'
            ? [errOrMessage.trim() || fallback]
            : getApiErrorMessages(errOrMessage, fallback);
        dispatch(showAlerts({ messages, type: 'error' }));
      },
    }),
    [dispatch]
  );
};

export type Notify = ReturnType<typeof useNotify>;
