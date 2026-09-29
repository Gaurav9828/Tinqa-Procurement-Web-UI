import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { type RootState } from '../../store/store';
import { hideAlert } from '../../store/alertSlice';
import { Alert } from './Alert';

export const GlobalAlertContainer: React.FC = () => {
  const dispatch = useDispatch();
  const { message, type, duration, isOpen } = useSelector((state: RootState) => state.alert);

  if (!isOpen || !message) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-md w-full px-4 pointer-events-none">
      <div className="pointer-events-auto transition-all transform duration-300 ease-out">
        <Alert
          type={type}
          message={message}
          duration={duration}
          onClose={() => dispatch(hideAlert())}
        />
      </div>
    </div>
  );
};