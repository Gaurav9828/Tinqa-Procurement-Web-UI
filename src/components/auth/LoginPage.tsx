import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Clock } from 'lucide-react';
import { authService } from '../../api/services/authService';
import { useAuthStore } from '../../store/useAuthStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginStore = useAuthStore((state) => state.login);

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSessionExpired(false);
    setIsLoading(true);

    try {
      const response = await authService.login({
        username: credentials.username,
        password: credentials.password,
      });

      loginStore(response);
      navigate('/analytics', { replace: true });
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const apiError = err as { response?: { data?: { message?: string } } };
        setError(
          apiError.response?.data?.message || 'Authentication failed. Please check your credentials.'
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-[#f5f5f7] px-4 transition-colors duration-200">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm border border-black/10 dark:border-white/10 mb-4 p-3">
            <img 
              src="/logo/TinQa.png" 
              alt="TinQa Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TinQa Procurement</h1>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 font-mono uppercase tracking-wider">
            Admin Portal Access
          </p>
        </div>

        {/* Login Card */}
        <div className="apple-card p-8 shadow-md">
          {sessionExpired && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Your session has expired. Please log in again to continue.</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all cursor-text placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all cursor-text placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-neutral-500 mt-6">
          Access permissions and roles are automatically granted based on system credentials.
        </p>
      </div>
    </div>
  );
};