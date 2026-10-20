import React, { useMemo, useState } from 'react';
import { compactRupees } from '../utils/money';
import { useVizPalette } from './palette';
import { useChartWidth } from './useChartWidth';
import { labelStride, linear, niceTicks } from './scale';
import { ChartTooltip, Legend } from './ChartTooltip';

export interface ColumnSeries {
  key: string;
  label: string;
  slot: number;
  values: number[];
}

interface Props {
  title: string;
  labels: string[];
  series: ColumnSeries[];
  height?: number;
  /**
   * One series whose sign matters (profit / loss): columns above zero take the positive pole, below zero the
   * negative pole (polarity, not identity).
   */
  polarity?: boolean;
  svgRef?: React.Ref<SVGSVGElement>;
  /** Lets an export find this chart (data-export-id). */
  exportId?: string;
}

const PAD = { top: 12, right: 12, bottom: 26, left: 56 };
const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

/** Rounded data-end, square at the zero baseline; grows up for positive and down for negative values. */
const barPath = (x: number, w: number, y0: number, y1: number) => {
  const r = Math.min(RADIUS, w / 2, Math.abs(y1 - y0));
  if (Math.abs(y1 - y0) < 0.5) return '';
  if (y1 < y0) {
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`;
  }
  return `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 - r} V${y0} Z`;
};

export const ColumnChart: React.FC<Props> = ({ title, labels, series, height = 220, polarity = false, svgRef, exportId }) => {
  const palette = useVizPalette();
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const { ticks, y, band } = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    const t = niceTicks(Math.min(0, ...all), Math.max(0, ...all));
    return {
      ticks: t,
      y: linear([t[0], t[t.length - 1]], [height - PAD.bottom, PAD.top]),
      band: (width - PAD.left - PAD.right) / Math.max(1, labels.length),
    };
  }, [series, labels.length, width, height]);

  const groupWidth = Math.min(band * 0.7, series.length * MAX_BAR + (series.length - 1) * GAP);
  const barWidth = Math.max(2, (groupWidth - (series.length - 1) * GAP) / series.length);
  const stride = labelStride(labels.length, width);
  const colorOf = (s: ColumnSeries, value: number) =>
    polarity ? (value >= 0 ? palette.positive : palette.negative) : palette.series[s.slot % palette.series.length];

  return (
    <div className="space-y-2">
      {!polarity && <Legend items={series.map((s) => ({ label: s.label, color: palette.series[s.slot % palette.series.length] }))} />}
      <div ref={ref} className="relative w-full">
        <svg ref={svgRef} data-export-id={exportId} width={width} height={height} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? palette.axis : palette.grid} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill={palette.muted}>
                {compactRupees(t)}
              </text>
            </g>
          ))}
          {labels.map((label, i) => {
            const groupX = PAD.left + i * band + (band - groupWidth) / 2;
            return (
              <g key={label + i}>
                {series.map((s, si) => {
                  const value = s.values[i] ?? 0;
                  return (
                    <path key={s.key} d={barPath(groupX + si * (barWidth + GAP), barWidth, y(0), y(value))} fill={colorOf(s, value)}
                      opacity={hover === null || hover === i ? 1 : 0.45} />
                  );
                })}
                {i % stride === 0 && (
                  <text x={PAD.left + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize={10} fill={palette.muted}>
                    {label}
                  </text>
                )}
                {/* Hit target: the whole band, bigger than the bars */}
                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={height - PAD.top - PAD.bottom} fill="transparent"
                  onMouseEnter={() => setHover(i)} data-export-ignore="true" />
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <ChartTooltip
            x={PAD.left + hover * band + band / 2}
            y={PAD.top}
            width={width}
            title={labels[hover]}
            rows={series.map((s) => ({ label: s.label, value: compactRupees(s.values[hover] ?? 0), color: colorOf(s, s.values[hover] ?? 0) }))}
          />
        )}
      </div>
    </div>
  );
};
