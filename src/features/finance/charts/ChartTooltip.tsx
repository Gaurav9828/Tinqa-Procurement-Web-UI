import React from 'react';

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Hover read-out: values in text ink, identity carried by the colored key beside them. */
export const ChartTooltip: React.FC<{ x: number; y: number; width: number; title: string; rows: TooltipRow[] }> = ({
  x,
  y,
  width,
  title,
  rows,
}) => {
  const left = Math.min(Math.max(8, x + 12), Math.max(8, width - 200));
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-48 rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1e]/95 shadow-lg px-3 py-2 text-[11px]"
      style={{ left, top: Math.max(0, y - 8) }}
    >
      <p className="font-semibold text-black dark:text-white mb-1">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center justify-between gap-2 text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1.5 min-w-0">
            {row.color && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: row.color }} aria-hidden />}
            <span className="truncate">{row.label}</span>
          </span>
          <span className="font-semibold tabular-nums text-black dark:text-white">{row.value}</span>
        </p>
      ))}
    </div>
  );
};

export const Legend: React.FC<{ items: { label: string; color: string; dashed?: boolean }[] }> = ({ items }) =>
  items.length < 2 ? null : (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600 dark:text-gray-300" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full" style={{ background: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
