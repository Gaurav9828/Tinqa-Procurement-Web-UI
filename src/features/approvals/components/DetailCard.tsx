import React from 'react';

interface DetailCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}

export const DetailCard: React.FC<DetailCardProps> = ({ icon, label, value }) => {
  const isModified = value !== null && value !== undefined && value !== '';

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isModified
          ? 'bg-blue-500/5 border-blue-500/30 dark:bg-blue-500/10 dark:border-blue-500/40'
          : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold pl-6">
        {isModified ? (
          <span className="text-black dark:text-white">{value}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">Unchanged</span>
        )}
      </p>
    </div>
  );
};