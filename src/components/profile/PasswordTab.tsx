import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CommonInput } from '../ui/FormInputs';
import { authService } from '../../api/services/authService';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { PASSWORD_POLICY_MESSAGE, validatePasswordChange } from '../../utils/passwordPolicy';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../store/useAuthStore';

export const PasswordTab: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const notify = useNotify();
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // State to control confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  // Validate form before opening modal
  const handlePreSubmitValidation = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePasswordChange(
      passwords.currentPassword,
      passwords.newPassword,
      passwords.confirmNewPassword
    );
    if (validationError) {
      notify.error(validationError);
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
        notify.success(response.message || 'Password updated successfully.');
        setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

        if (response.requiresLogin) {
          setTimeout(() => {
            logout();
            window.location.assign('/login');
          }, 1500);
        }
      } else {
        notify.error(response.message || 'Failed to update password.');
      }
    } catch (err: unknown) {
      notify.error(err, 'Failed to update password. Please check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="apple-card p-6 max-w-xl">
      <form onSubmit={handlePreSubmitValidation} className="space-y-6">

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
            {PASSWORD_POLICY_MESSAGE}
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