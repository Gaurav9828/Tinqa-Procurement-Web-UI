import React from 'react';
import { WifiOff, AlertTriangle, LogIn, RefreshCw } from 'lucide-react';

export const GlobalErrorPage: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const errorType = queryParams.get('type');

  const handleNavigateToLogin = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const handleRetry = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-6">
        {errorType === 'network' ? (
          <WifiOff className="w-8 h-8" />
        ) : (
          <AlertTriangle className="w-8 h-8" />
        )}
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        {errorType === 'network' ? 'Connection / Network Failure' : 'Server Exception Occurred'}
      </h1>

      <p className="text-sm text-neutral-400 max-w-md mb-8">
        {errorType === 'network'
          ? 'Unable to reach the backend service. Your active session tokens have been cleared for safety.'
          : 'An unexpected internal error occurred on the server. Please sign in again or contact system support.'}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleRetry}
          className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>

        <button
          onClick={handleNavigateToLogin}
          className="px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <LogIn className="w-4 h-4" /> Go to Login Page
        </button>
      </div>
    </div>
  );
};