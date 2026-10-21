import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { LoginPageContent } from './loginPageContent';

interface AuthBrandPanelProps {
  content: LoginPageContent;
  /** Logo + name in the top corner. */
  brand: React.ReactNode;
  footer?: React.ReactNode;
  /** Smaller type and padding, for the company profile preview. */
  compact?: boolean;
  className?: string;
}

/**
 * The image half of the sign-in page (same layout as the storefront's): the company profile's background image
 * covering the whole half, or the built-in gradient when there is none (or it can't be loaded), with the headline,
 * tagline and highlight points over it. A dark scrim keeps the white text readable on any photo.
 */
export const AuthBrandPanel: React.FC<AuthBrandPanelProps> = ({ content, brand, footer, compact, className = '' }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const image = content.imageUrl && content.imageUrl !== failedUrl ? content.imageUrl : null;
  const { headline, tagline, highlights } = content;

  return (
    <aside
      data-testid="auth-brand-panel"
      className={`relative flex-col justify-between overflow-hidden text-white select-none bg-gradient-to-br from-[#0b1f3a] via-[#0a3a7a] to-[#0071e3] ${
        compact ? 'p-5 gap-4' : 'p-10 xl:p-12 gap-8'
      } ${className}`}
    >
      {image ? (
        <>
          <img src={image} alt="" onError={() => setFailedUrl(image)} className="absolute inset-0 w-full h-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/50" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-[#5ac8fa]/20 blur-3xl" />
        </>
      )}

      <div className="relative">{brand}</div>

      {(headline || tagline || highlights.length > 0) && (
        <div className={`relative ${compact ? 'max-w-xs' : 'max-w-md'}`}>
          {headline && (
            <h2 className={`font-bold leading-tight tracking-tight break-words drop-shadow-sm ${compact ? 'text-lg' : 'text-3xl xl:text-4xl'}`}>{headline}</h2>
          )}
          {tagline && <p className={`text-white/85 break-words ${compact ? 'mt-2 text-[11px]' : 'mt-4 text-base'}`}>{tagline}</p>}
          {highlights.length > 0 && (
            <ul className={compact ? 'mt-3 space-y-1.5' : 'mt-8 space-y-3'}>
              {highlights.map((point, i) => (
                <li key={i} className={`flex items-center text-white/90 ${compact ? 'gap-2 text-[10px]' : 'gap-3 text-sm'}`}>
                  <span
                    className={`flex-none rounded-lg bg-white/15 ring-1 ring-white/20 backdrop-blur-sm flex items-center justify-center ${
                      compact ? 'w-5 h-5' : 'w-8 h-8'
                    }`}
                  >
                    <CheckCircle2 className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                  </span>
                  <span className="min-w-0 break-words">{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {footer ? <div className={`relative text-white/70 ${compact ? 'text-[9px]' : 'text-xs'}`}>{footer}</div> : <div />}
    </aside>
  );
};
