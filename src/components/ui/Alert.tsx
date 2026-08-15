import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface AlertProps {
  type: 'error' | 'success';
  message: string | null;
  duration?: number; // Duration in ms (defaults to 5000)
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progressKey, setProgressKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = () => {
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setProgressKey((prev) => prev + 1);

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, duration]);

  if (!message || !isVisible) return null;

  const isError = type === 'error';

  return (
    // Outer Container without overflow-hidden so the glowing head can overlap the bottom border
    <div
      className={`relative p-4 rounded-xl text-sm flex items-center justify-between gap-3 border transition-all ${
        isError
          ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
      }`}
    >
      {/* Precision Trajectory Keyframes */}
      <style>{`
        @keyframes cometToLeft {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(0%);
          }
        }
      `}</style>

      <div className="flex items-center gap-3 z-10">
        {isError ? (
          <AlertCircle className="w-5 h-5 shrink-0" />
        ) : (
          <CheckCircle className="w-5 h-5 shrink-0" />
        )}
        <span>{message}</span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className={`p-1 rounded-lg transition-colors z-10 hover:bg-black/5 dark:hover:bg-white/10 ${
          isError ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>

      {/* TRACK CONTAINER */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none">
        {/* Track Rail Background */}
        <div className="absolute inset-0 bg-black/5 dark:bg-white/10 rounded-full" />

        {/* 1. CLIPPED TAIL LAYER (Keeps horizontal tail inside card bounds) */}
        <div className="absolute inset-0 overflow-hidden rounded-b-xl">
          <div
            key={`tail-${progressKey}`}
            style={{
              animation: `cometToLeft ${duration}ms linear forwards`,
            }}
            className="relative h-full w-full"
          >
            <div
              className={`absolute right-0 top-0 bottom-0 left-0 ${
                isError
                  ? 'bg-gradient-to-r from-red-500 via-red-500/30 via-40% to-transparent'
                  : 'bg-gradient-to-r from-emerald-400 via-emerald-500/30 via-40% to-transparent'
              }`}
            />
          </div>
        </div>

        {/* 2. UNCLIPPED HEAD LAYER (Allows head glow to float outside bottom border) */}
        <div className="absolute inset-0 z-20">
          <div
            key={`head-${progressKey}`}
            onAnimationEnd={handleDismiss}
            style={{
              animation: `cometToLeft ${duration}ms linear forwards`,
            }}
            className="relative h-full w-full"
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center">
              {/* Outer Diffuse Coma Glow */}
              <div
                className={`absolute w-6 h-6 rounded-full blur-[3px] opacity-80 ${
                  isError ? 'bg-red-500' : 'bg-emerald-400'
                }`}
              />

              {/* Inner Ion Envelope */}
              <div
                className={`absolute w-3.5 h-3.5 rounded-full blur-[0.5px] opacity-95 ${
                  isError ? 'bg-red-300' : 'bg-teal-200'
                }`}
              />

              {/* Intense White Nucleus Core */}
              <div className="relative w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,1)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};