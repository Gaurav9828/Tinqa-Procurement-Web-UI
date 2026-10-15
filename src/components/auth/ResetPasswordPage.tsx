import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2, Loader2, Eye, EyeOff, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../api/services/authService';
import { useNotify } from '../../hooks/useNotify';
import { PASSWORD_MAX_LENGTH, isStrongPassword, validateNewPassword } from '../../utils/passwordPolicy';
import { PasswordRequirements } from './PasswordRequirements';

const inputClass =
  'w-full px-4 py-2.5 pr-11 rounded-xl border bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all';
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5';

/**
 * First login: the account still has its temporary password. The user just typed it to sign in,
 * so only the new password is asked for. Every other route redirects here until it's set.
 */
export const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updatePasswordRequirement = useAuthStore((state) => state.updatePasswordRequirement);
  const logout = useAuthStore((state) => state.logout);
  const username = useAuthStore((state) => state.user?.username);
  const navigate = useNavigate();
  const notify = useNotify();

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit = isStrongPassword(newPassword) && newPassword === confirmPassword && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateNewPassword(newPassword, confirmPassword);
    if (validationError) {
      notify.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.setFirstLoginPassword({ newPassword, confirmNewPassword: confirmPassword });

      if (!response.success) {
        notify.error(response, 'Failed to set your password.');
        return;
      }

      if (response.requiresLogin) {
        logout();
        notify.success(response.message || 'Password set. Sign in with your new password.');
        navigate('/login', { replace: true });
        return;
      }

      updatePasswordRequirement(false);
      notify.success(response.message || 'Password set. Welcome!');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      notify.error(err, 'Failed to set your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore API errors during logout cleanup
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const toggle = (
    <button
      type="button"
      onClick={() => setShowPasswords((s) => !s)}
      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
      aria-pressed={showPasswords}
      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 cursor-pointer"
    >
      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-[#f5f5f7] p-4">
      <div className="w-full max-w-md apple-card p-8 space-y-6 shadow-md">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set your new password</h1>
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            {username ? `Welcome, ${username}. ` : ''}You signed in with a temporary password. Choose a new one to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Set new password" noValidate>
          <div>
            <label htmlFor="new-password" className={labelClass}>
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-describedby="password-requirements"
                className={`${inputClass} border-black/10 dark:border-white/10`}
              />
              {toggle}
            </div>
            <PasswordRequirements id="password-requirements" password={newPassword} />
          </div>

          <div>
            <label htmlFor="confirm-password" className={labelClass}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              required
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={mismatch}
              aria-describedby={mismatch ? 'confirm-password-error' : undefined}
              className={`${inputClass} ${mismatch ? 'border-rose-500/80' : 'border-black/10 dark:border-white/10'}`}
            />
            {mismatch && (
              <p id="confirm-password-error" role="alert" className="text-[11px] text-rose-600 dark:text-rose-400 pt-1">
                Passwords don't match.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Set password &amp; continue</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-neutral-200 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
};
