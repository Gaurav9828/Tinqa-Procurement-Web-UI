import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../api/services/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotify } from '../../hooks/useNotify';
import { AuthCard } from './AuthCard';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const loginStore = useAuthStore((state) => state.login);

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      notify.warning('Your session has expired. Please log in again to continue.');
    }
  }, [searchParams, notify]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const username = credentials.username.trim();
    if (!username || !credentials.password) {
      notify.error('Username and password are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.login({
        username,
        password: credentials.password,
      });

      loginStore(response);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(response.isFirstLogin ? '/reset-password' : from || '/', { replace: true });
    } catch (err: unknown) {
      notify.error(err, 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/60 focus:border-[#0071e3] transition-all placeholder:text-gray-400';

  return (
    <AuthCard
      subtitle="Staff & Dealer Sign-in"
      footer={
        <p className="text-center text-xs text-gray-400 dark:text-neutral-500 mt-4">
          Your role and access are applied automatically after sign-in.
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="login-username" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">
            Username
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="login-username"
              type="text"
              required
              autoFocus
              placeholder="Enter your username"
              autoComplete="username"
              maxLength={64}
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-neutral-300">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-[#0071e3] hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              maxLength={128}
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !credentials.username.trim() || !credentials.password}
          className="w-full h-10 px-4 bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#006edb] text-white rounded-lg text-sm font-semibold transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
};
