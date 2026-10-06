import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../api/services/authService';
import { useNotify } from '../../hooks/useNotify';
import { PASSWORD_MAX_LENGTH, PASSWORD_POLICY_MESSAGE, validatePasswordChange } from '../../utils/passwordPolicy';

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all';

export const ResetPasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updatePasswordRequirement = useAuthStore((state) => state.updatePasswordRequirement);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const notify = useNotify();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (validationError) {
      notify.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      if (!response.success) {
        notify.error(response.message || 'Failed to update password.');
        return;
      }

      if (response.requiresLogin) {
        logout();
        navigate('/login', { replace: true });
        return;
      }

      updatePasswordRequirement(false);
      navigate('/analytics', { replace: true });
    } catch (err: unknown) {
      notify.error(err, 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-[#f5f5f7] p-4">
      <div className="w-full max-w-md apple-card p-8 space-y-6 shadow-md">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset Default Password</h1>
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            First-time login detected. Please create a secure personal password.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Current (Default) Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <p className="text-[11px] text-gray-500 dark:text-neutral-400 pt-1">{PASSWORD_POLICY_MESSAGE}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Update Password & Continue</span>
          </button>
        </form>
      </div>
    </div>
  );
};
