import React from 'react';

interface ProductStatusBadgeProps {
  isEnabled: boolean;
}

export const ProductStatusBadge: React.FC<ProductStatusBadgeProps> = ({ isEnabled }) => {
  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
        isEnabled
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      }`}
    >
      {isEnabled ? 'ENABLED' : 'DISABLED'}
    </span>
  );
};