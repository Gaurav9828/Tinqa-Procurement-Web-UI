import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CommonInput } from '../ui/FormInputs';
import { Alert } from '../ui/Alert';
import { authService } from '../../api/services/authService';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const PasswordTab: React.FC = () => {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // State to control confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  // Validate form before opening modal
  const handlePreSubmitValidation = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    const trimmedCurrent = passwords.currentPassword.trim();
    const trimmedNew = passwords.newPassword.trim();
    const trimmedConfirm = passwords.confirmNewPassword.trim();

    if (!trimmedCurrent) {
      setPassError('Current password is required.');
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(trimmedNew)) {
      setPassError(
        'New password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&).'
      );
      return;
    }

    // Client-side direct equality check
    if (trimmedNew === trimmedCurrent) {
      setPassError('New password must be different from current password.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setPassError('New password and confirm password do not match.');
      return;
    }

    // Opens confirmation popup once validations pass
    setIsConfirmOpen(true);
  };

  // Execution handler called when user clicks "Confirm" in the modal
  const handleExecutePasswordChange = async () => {
    setIsConfirmOpen(false);
    setIsChangingPassword(true);

    try {
      const response = await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmNewPassword: passwords.confirmNewPassword,
      });

      if (response.success) {
        setPassSuccess(response.message || 'Password updated successfully.');
        setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

        if (response.requiresLogin) {
          setTimeout(() => {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login';
          }, 1500);
        }
      }
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const apiError = err as { response?: { data?: { message?: string } } };
        // Clear message returned directly from backend API
        setPassError(
          apiError.response?.data?.message || 'Failed to update password. Please check your current password.'
        );
      } else if (err instanceof Error) {
        setPassError(err.message);
      } else {
        setPassError('An unexpected error occurred while updating the password.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="apple-card p-6 max-w-xl">
      <form onSubmit={handlePreSubmitValidation} className="space-y-6">
        {/* Dismissible Feedback Alerts */}
        <Alert type="error" message={passError} onClose={() => setPassError(null)} />
        <Alert type="success" message={passSuccess} onClose={() => setPassSuccess(null)} />

        <CommonInput
          label="Current Password"
          type="password"
          required
          value={passwords.currentPassword}
          onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
        />

        <div className="space-y-1">
          <CommonInput
            label="New Password"
            type="password"
            required
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          />
          <p className="text-[11px] text-gray-500 dark:text-neutral-400 pt-1">
            Must be at least 8 characters long with uppercase, lowercase, number, and special character.
          </p>
        </div>

        <CommonInput
          label="Confirm New Password"
          type="password"
          required
          value={passwords.confirmNewPassword}
          onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })}
        />

        <div className="pt-2">
          <button
            type="submit"
            disabled={
              isChangingPassword ||
              !passwords.currentPassword ||
              !passwords.newPassword ||
              !passwords.confirmNewPassword
            }
            className="w-full px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-gray-300 dark:disabled:bg-neutral-800 text-white disabled:text-gray-500 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isChangingPassword ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        actionType="CHANGE_PASSWORD"
        isSubmitting={isChangingPassword}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecutePasswordChange}
      />
    </div>
  );
};