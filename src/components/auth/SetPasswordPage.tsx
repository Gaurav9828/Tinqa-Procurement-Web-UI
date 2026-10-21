import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { usePasswordLink } from '../../hooks/usePasswordLink';
import { useAuthStore } from '../../store/useAuthStore';
import { PASSWORD_MAX_LENGTH, isStrongPassword, validateNewPassword } from '../../utils/passwordPolicy';
import { useNotify } from '../../hooks/useNotify';
import { PasswordRequirements } from './PasswordRequirements';
import { AuthCard } from './AuthCard';

const inputClass =
  'w-full px-4 py-2.5 pr-11 rounded-xl border bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all';
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5';

/**
 * The page an emailed password link opens (/set-password?token=…): a new employee's first password, or "forgot
 * password". No old or temporary password is asked for; the link itself proves who it is, works once and expires
 * after 15 minutes. Saving signs out every session of the account, so the person signs in afresh.
 */
export const SetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  // Read once: the token is then taken out of the address bar so it can't leak through history or a shared screen
  const [token] = useState(() => searchParams.get('token') ?? '');
  const { status, link, problem, expired, isSaving, setPassword } = usePasswordLink(token);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const notify = useNotify();

  useEffect(() => {
    if (searchParams.has('token')) window.history.replaceState(null, '', '/set-password');
  }, [searchParams]);

  const setup = link?.purpose === 'SETUP';
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit = isStrongPassword(newPassword) && newPassword === confirmPassword && !isSaving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validateNewPassword(newPassword, confirmPassword);
    if (invalid) {
      notify.error(invalid);
      return;
    }
    if (await setPassword(newPassword, confirmPassword)) {
      // Every session of the account was signed out on the server
      logout();
      navigate('/login', { replace: true });
    }
  };

  if (status === 'checking') {
    return (
      <AuthCard subtitle="Set your password">
        <p role="status" className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking your link…
        </p>
      </AuthCard>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthCard subtitle="Set your password">
        <div role="alert" className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold">{expired ? 'This link has expired' : 'This link can’t be used'}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{problem}</p>
          <Link to="/forgot-password" className="inline-block px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold">
            Get a new link
          </Link>
        </div>
      </AuthCard>
    );
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setShowPasswords((shown) => !shown)}
      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
      aria-pressed={showPasswords}
      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 cursor-pointer"
    >
      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <AuthCard subtitle={setup ? 'Set up your account' : 'Reset your password'}>
      <div className="text-center space-y-2 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold">{setup ? `Welcome, ${link?.username}` : 'Choose a new password'}</h2>
        <p className="text-xs text-gray-500 dark:text-neutral-400">
          {setup
            ? 'Choose the password you will sign in with. Your username is shown above.'
            : `Choose a new password for ${link?.username}. You will be signed out everywhere else.`}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4" aria-label="Choose your password" noValidate>
        <div>
          <label htmlFor="link-new-password" className={labelClass}>
            New password
          </label>
          <div className="relative">
            <input
              id="link-new-password"
              type={showPasswords ? 'text' : 'password'}
              required
              autoFocus
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              aria-describedby="link-password-requirements"
              className={`${inputClass} border-black/10 dark:border-white/10`}
            />
            {toggle}
          </div>
          <PasswordRequirements id="link-password-requirements" password={newPassword} />
        </div>

        <div>
          <label htmlFor="link-confirm-password" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="link-confirm-password"
            type={showPasswords ? 'text' : 'password'}
            required
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={mismatch}
            className={`${inputClass} ${mismatch ? 'border-rose-500/80' : 'border-black/10 dark:border-white/10'}`}
          />
          {mismatch && (
            <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400 pt-1">
              Passwords don't match.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>Save password</span>
        </button>
      </form>
    </AuthCard>
  );
};
