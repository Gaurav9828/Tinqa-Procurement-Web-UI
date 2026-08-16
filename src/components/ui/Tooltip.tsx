import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  title?: React.ReactNode;
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  content,
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY - 8, // 8px above the trigger element
        left: rect.left + rect.width / 2,
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  if (!content) return <>{children}</>;

  return (
    <div
      ref={triggerRef}
      className="inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={handleMouseEnter}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {isVisible &&
        createPortal(
          <div
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            role="tooltip"
            className={`fixed z-[9999] -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-150 ease-out animate-in fade-in zoom-in-95 ${className}`}
          >
            {/* Tooltip Card */}
            <div className="w-max max-w-xs sm:max-w-md p-3 text-xs text-neutral-100 bg-neutral-900/95 dark:bg-neutral-800/95 border border-white/15 dark:border-white/10 rounded-xl shadow-2xl backdrop-blur-md leading-relaxed break-words whitespace-normal tracking-wide space-y-1">
              {title && (
                <div className="font-semibold text-[11px] text-blue-400 border-b border-white/10 pb-1 mb-1">
                  {title}
                </div>
              )}
              <div className="text-neutral-200">{content}</div>
            </div>

            {/* Downward Pointer Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-4 border-t-neutral-900 dark:border-t-neutral-800 border-x-transparent border-b-transparent" />
          </div>,
          document.body
        )}
    </div>
  );
};