import React, { useMemo, useState } from 'react';
import { compactRupees } from '../utils/money';
import { useVizPalette } from './palette';
import { useChartWidth } from './useChartWidth';
import { labelStride, linear, niceTicks } from './scale';
import { ChartTooltip, Legend } from './ChartTooltip';

export interface LineSeries {
  key: string;
  label: string;
  /** Categorical slot (0-based), fixed per entity so colors never move. */
  slot: number;
  values: number[];
}

interface Props {
  title: string;
  labels: string[];
  series: LineSeries[];
  height?: number;
  /** One series: a light area wash under the line. */
  area?: boolean;
  svgRef?: React.Ref<SVGSVGElement>;
  /** Lets an export find this chart (data-export-id). */
  exportId?: string;
}

const PAD = { top: 12, right: 16, bottom: 26, left: 56 };

/** Change over time: 2px lines, zero baseline, crosshair + tooltip on hover. Amounts are paise. */
export const LineChart: React.FC<Props> = ({ title, labels, series, height = 220, area = false, svgRef, exportId }) => {
  const palette = useVizPalette();
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all));
    const y = linear([ticks[0], ticks[ticks.length - 1]], [height - PAD.bottom, PAD.top]);
    const innerWidth = width - PAD.left - PAD.right;
    const x = (i: number) => PAD.left + (labels.length <= 1 ? innerWidth / 2 : (i / (labels.length - 1)) * innerWidth);
    return { ticks, y, x, innerWidth };
  }, [series, labels.length, width, height]);

  const { ticks, y, x } = geometry;
  const stride = labelStride(labels.length, width);
  const colorOf = (slot: number) => palette.series[slot % palette.series.length];
  const path = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const onMove = (event: React.MouseEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left + PAD.left;
    let best = 0;
    labels.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div className="space-y-2">
      <Legend items={series.map((s) => ({ label: s.label, color: colorOf(s.slot) }))} />
      <div ref={ref} className="relative w-full">
        <svg ref={svgRef} data-export-id={exportId} width={width} height={height} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? palette.axis : palette.grid} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill={palette.muted}>
                {compactRupees(t)}
              </text>
            </g>
          ))}
          {labels.map((label, i) =>
            i % stride === 0 ? (
              <text key={label + i} x={x(i)} y={height - 8} textAnchor="middle" fontSize={10} fill={palette.muted}>
                {label}
              </text>
            ) : null
          )}
          {area && series.length === 1 && labels.length > 1 && (
            <path
              d={`${path(series[0].values)} L${x(labels.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
              fill={colorOf(series[0].slot)}
              fillOpacity={0.1}
            />
          )}
          {series.map((s) => (
            <path key={s.key} d={path(s.values)} fill="none" stroke={colorOf(s.slot)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {/* End markers carry a surface ring so they stay legible where lines cross */}
          {series.map((s) =>
            s.values.length ? (
              <circle key={s.key + '-end'} cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={4}
                fill={colorOf(s.slot)} stroke={palette.surface} strokeWidth={2} />
            ) : null
          )}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={height - PAD.bottom} stroke={palette.axis} strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.key + '-hover'} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={colorOf(s.slot)}
                  stroke={palette.surface} strokeWidth={2} />
              ))}
            </g>
          )}
          <rect x={PAD.left} y={0} width={Math.max(0, width - PAD.left - PAD.right)} height={height} fill="transparent"
            onMouseMove={onMove} onMouseLeave={() => setHover(null)} data-export-ignore="true" />
        </svg>
        {hover !== null && (
          <ChartTooltip
            x={x(hover)}
            y={PAD.top}
            width={width}
            title={labels[hover]}
            rows={series.map((s) => ({ label: s.label, value: compactRupees(s.values[hover] ?? 0), color: colorOf(s.slot) }))}
          />
        )}
      </div>
    </div>
  );
};
