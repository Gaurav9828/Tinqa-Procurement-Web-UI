import React from 'react';
import { useLoginPageContent } from '../../hooks/useLoginPageContent';
import { AuthBrandPanel } from './AuthBrandPanel';

export const BrandBadge: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className="flex items-center gap-3">
    <div className={`rounded-xl bg-white shadow-sm border border-black/5 ${compact ? 'w-7 h-7 p-1' : 'w-10 h-10 p-1.5'}`}>
      <img src="/logo/TinQa.png" alt="TinQa Logo" className="w-full h-full object-contain" />
    </div>
    <span className={`font-semibold tracking-tight ${compact ? 'text-sm' : 'text-lg'}`}>TinQa Procurement</span>
  </div>
);

/**
 * Split-screen shell used by the sign-in pages, the same layout as the storefront's: on wide screens the left half is
 * the company profile's sign-in image and text (see AuthBrandPanel), the right half the form; on mobile a compact header.
 */
export const AuthCard: React.FC<{ subtitle: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ subtitle, children, footer }) => {
  const content = useLoginPageContent();
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-200">
      <AuthBrandPanel
        content={content}
        brand={<BrandBadge />}
        footer={<>© {new Date().getFullYear()} TinQa. All rights reserved.</>}
        className="hidden lg:flex"
      />

      {/* Form column */}
      <main className="flex flex-col justify-center items-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Compact header (mobile) */}
          <div className="mb-6 lg:hidden">
            <BrandBadge />
          </div>

          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight">{subtitle}</h1>
          </div>

          <div className="apple-card p-6 shadow-sm">{children}</div>
          {footer}
        </div>
      </main>
    </div>
  );
};
