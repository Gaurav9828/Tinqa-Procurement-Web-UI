import React, { useState } from 'react';
import { compactRupees, rupees } from '../utils/money';
import { useVizPalette } from './palette';

export interface DonutSlice {
  key: string;
  label: string;
  /** Magnitude (paise, positive). */
  value: number;
}

interface Props {
  title: string;
  slices: DonutSlice[];
  centerLabel: string;
  size?: number;
  svgRef?: React.Ref<SVGSVGElement>;
  /** Lets an export find this chart (data-export-id). */
  exportId?: string;
}

const MAX_SLICES = 7; // the 8th slot is "Other": never a generated hue

/** Part-to-whole of one total. Slices are separated by a 2px surface gap; a legend with values always sits beside it. */
export const DonutChart: React.FC<Props> = ({ title, slices, centerLabel, size = 180, svgRef, exportId }) => {
  const palette = useVizPalette();
  const [hover, setHover] = useState<string | null>(null);

  const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const shown = sorted.length > MAX_SLICES + 1
    ? [...sorted.slice(0, MAX_SLICES), { key: 'other', label: 'Other', value: sorted.slice(MAX_SLICES).reduce((n, s) => n + s.value, 0) }]
    : sorted;
  const total = shown.reduce((n, s) => n + s.value, 0);
  const radius = size / 2 - 4;
  const inner = radius * 0.62;
  const c = size / 2;

  const sweeps = shown.map((slice) => (total > 0 ? (slice.value / total) * Math.PI * 2 : 0));
  const arcs = shown.map((slice, i) => {
    const start = -Math.PI / 2 + sweeps.slice(0, i).reduce((n, v) => n + v, 0);
    return { slice, start, end: start + sweeps[i], color: slice.key === 'other' ? palette.muted : palette.series[i % palette.series.length] };
  });

  const arcPath = (start: number, end: number) => {
    if (end - start >= Math.PI * 2 - 1e-6) end = start + Math.PI * 2 - 1e-4;
    const large = end - start > Math.PI ? 1 : 0;
    const p = (r: number, a: number) => `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
    return `M${p(radius, start)} A${radius},${radius} 0 ${large} 1 ${p(radius, end)} L${p(inner, end)} A${inner},${inner} 0 ${large} 0 ${p(inner, start)} Z`;
  };

  const focused = arcs.find((a) => a.slice.key === hover);

  if (total === 0) {
    return <p className="py-10 text-center text-xs text-gray-500" role="status">Nothing recorded in this period.</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg ref={svgRef} data-export-id={exportId} width={size} height={size} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" className="shrink-0">
        {arcs.map(({ slice, start, end, color }) => (
          <path key={slice.key} d={arcPath(start, end)} fill={color} stroke={palette.surface} strokeWidth={2}
            opacity={hover === null || hover === slice.key ? 1 : 0.45}
            onMouseEnter={() => setHover(slice.key)} onMouseLeave={() => setHover(null)} />
        ))}
        <text x={c} y={c - 4} textAnchor="middle" fontSize={15} fontWeight={600} fill={palette.ink}>
          {compactRupees(focused ? focused.slice.value : total)}
        </text>
        <text x={c} y={c + 13} textAnchor="middle" fontSize={10} fill={palette.muted}>
          {focused ? `${((focused.slice.value / total) * 100).toFixed(1)}%` : centerLabel}
        </text>
      </svg>
      <ul className="w-full space-y-1 text-[11px]" aria-label={`${title} breakdown`}>
        {arcs.map(({ slice, color }) => (
          <li key={slice.key} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${hover === slice.key ? 'bg-black/5 dark:bg-white/5' : ''}`}
            onMouseEnter={() => setHover(slice.key)} onMouseLeave={() => setHover(null)}>
            <span className="flex items-center gap-1.5 min-w-0 text-gray-600 dark:text-gray-300">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} aria-hidden />
              <span className="truncate" title={slice.label}>{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-black dark:text-white font-semibold" title={rupees(slice.value)}>
              {compactRupees(slice.value)} <span className="font-normal text-gray-400">{((slice.value / total) * 100).toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
