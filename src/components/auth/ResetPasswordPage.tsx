import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const updatePasswordRequirement = useAuthStore((state) => state.updatePasswordRequirement);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      // Optional: Call your backend API here to persist password change
      // await authService.changePassword(newPassword);

      updatePasswordRequirement(false);
      navigate('/analytics', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
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

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Update Password & Continue</span>
          </button>
        </form>
      </div>
    </div>
  );
};