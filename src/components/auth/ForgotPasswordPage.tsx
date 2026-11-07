import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck, Send, UserRound } from 'lucide-react';
import { authService } from '../../api/services/authService';
import { useApiAction } from '../../hooks/useApiAction';
import { AuthCard } from './AuthCard';

/**
 * "Forgot password?": staff and suppliers enter the username or email they sign in with and get a link to choose a new
 * password (valid for 15 minutes, once). The answer never says whether an account matched.
 */
export const ForgotPasswordPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const action = useApiAction();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    const ok = await action.run(() => authService.forgotPassword({ identifier: value }), {
      success: "If an account matches, we've emailed it a link to choose a new password.",
      failure: 'The link could not be sent.',
    });
    if (ok) setSent(true);
  };

  return (
    <AuthCard subtitle="Reset your password">
      {sent ? (
        <div role="status" className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <MailCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            If <strong>{identifier.trim()}</strong> belongs to an account, we've sent a link to its email (your personal
            email for employees). The link works once, for 15 minutes.
          </p>
          <button type="button" onClick={() => setSent(false)} className="text-xs font-semibold text-[#0071e3] hover:underline cursor-pointer">
            Didn't get it? Send again
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" aria-label="Forgot password">
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Enter the username or email you sign in with. We'll email you a link to choose a new password.
          </p>
          <div>
            <label htmlFor="forgot-identifier" className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Username or email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <UserRound className="w-4 h-4" />
              </div>
              <input
                id="forgot-identifier"
                type="text"
                required
                autoFocus
                autoComplete="username"
                maxLength={150}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={action.isSubmitting || !identifier.trim()}
            className="w-full py-2.5 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {action.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Email me a link
          </button>
        </form>
      )}
      <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-neutral-200">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </Link>
    </AuthCard>
  );
};
