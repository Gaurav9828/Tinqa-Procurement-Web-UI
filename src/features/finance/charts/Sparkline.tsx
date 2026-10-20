import React from 'react';
import { useVizPalette } from './palette';

/** Small balance trend for the hero figure: muted line, current point in the accent. */
export const Sparkline: React.FC<{ values: number[]; width?: number; height?: number; label: string }> = ({
  values,
  width = 160,
  height = 40,
  label,
}) => {
  const palette = useVizPalette();
  if (values.length < 2) return null;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const x = (i: number) => 4 + (i / (values.length - 1)) * (width - 8);
  const y = (v: number) => height - 4 - ((v - min) / span) * (height - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  return (
    <svg width={width} height={height} role="img" aria-label={label}>
      <line x1={4} x2={width - 4} y1={y(0)} y2={y(0)} stroke={palette.axis} strokeWidth={1} />
      <path d={d} fill="none" stroke={palette.muted} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r={4} fill={palette.series[0]} stroke={palette.surface} strokeWidth={2} />
    </svg>
  );
};
