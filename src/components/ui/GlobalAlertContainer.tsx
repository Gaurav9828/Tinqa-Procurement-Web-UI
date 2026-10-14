import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { type RootState } from '../../store/store';
import { dismissAlert } from '../../store/alertSlice';
import { Alert } from './Alert';

/** Stack of alerts (newest on top). Every message — e.g. each field error from the server — gets its own section. */
export const GlobalAlertContainer: React.FC = () => {
  const dispatch = useDispatch();
  const alerts = useSelector((state: RootState) => state.alert.alerts);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-md w-full px-4 pointer-events-none" aria-live="polite">
      <ul className="flex flex-col gap-2" aria-label="Notifications">
        {alerts.map((alert) => (
          <li key={alert.id} className="pointer-events-auto transition-all transform duration-300 ease-out">
            <Alert type={alert.type} message={alert.message} duration={alert.duration} onClose={() => dispatch(dismissAlert(alert.id))} />
          </li>
        ))}
      </ul>
    </div>
  );
};
