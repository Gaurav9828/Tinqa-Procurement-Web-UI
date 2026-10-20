import React, { useMemo, useState } from 'react';
import { compactRupees } from '../utils/money';
import { useVizPalette } from './palette';
import { useChartWidth } from './useChartWidth';
import { linear, niceTicks } from './scale';
import { ChartTooltip } from './ChartTooltip';

export interface WaterfallStep {
  label: string;
  /** A change (added or taken away), or a subtotal measured from zero. */
  value: number;
  total?: boolean;
}

/** Revenue down to PAT: each cost steps down, each subtotal stands on zero. Up = positive pole, down = negative pole. */
export const WaterfallChart: React.FC<{ title: string; steps: WaterfallStep[]; height?: number; svgRef?: React.Ref<SVGSVGElement>; exportId?: string }> = ({
  title,
  steps,
  height = 260,
  svgRef, exportId,
}) => {
  const palette = useVizPalette();
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const PAD = { top: 18, right: 12, bottom: 44, left: 56 };

  const bars = useMemo(() => {
    const result: (WaterfallStep & { from: number; to: number })[] = [];
    for (const step of steps) {
      const previous = result.length ? result[result.length - 1].to : 0;
      result.push(step.total ? { ...step, from: 0, to: step.value } : { ...step, from: previous, to: previous + step.value });
    }
    return result;
  }, [steps]);

  const values = bars.flatMap((b) => [b.from, b.to]);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const y = linear([ticks[0], ticks[ticks.length - 1]], [height - PAD.bottom, PAD.top]);
  const band = (width - PAD.left - PAD.right) / Math.max(1, bars.length);
  const barWidth = Math.min(36, band * 0.62);

  return (
    <div ref={ref} className="relative w-full">
      <svg ref={svgRef} data-export-id={exportId} width={width} height={height} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? palette.axis : palette.grid} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill={palette.muted}>{compactRupees(t)}</text>
          </g>
        ))}
        {bars.map((bar, i) => {
          const x = PAD.left + i * band + (band - barWidth) / 2;
          const top = Math.min(y(bar.from), y(bar.to));
          const h = Math.max(1, Math.abs(y(bar.from) - y(bar.to)));
          const color = bar.total ? palette.neutral : bar.value >= 0 ? palette.positive : palette.negative;
          const words = bar.label.split(' ');
          return (
            <g key={bar.label} opacity={hover === null || hover === i ? 1 : 0.5}>
              <rect x={x} y={top} width={barWidth} height={h} rx={3} fill={color} />
              {i < bars.length - 1 && (
                <line x1={x + barWidth} x2={x + band} y1={y(bar.to)} y2={y(bar.to)} stroke={palette.axis} strokeWidth={1} />
              )}
              {bar.total && (
                <text x={x + barWidth / 2} y={top - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill={palette.inkSecondary}>
                  {compactRupees(bar.value)}
                </text>
              )}
              <text x={x + barWidth / 2} y={height - PAD.bottom + 14} textAnchor="middle" fontSize={10} fill={palette.muted}>
                <tspan x={x + barWidth / 2}>{words[0]}</tspan>
                {words.length > 1 && <tspan x={x + barWidth / 2} dy={12}>{words.slice(1).join(' ')}</tspan>}
              </text>
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
          title={bars[hover].label}
          rows={[{ label: bars[hover].total ? 'Subtotal' : bars[hover].value >= 0 ? 'Adds' : 'Takes away', value: compactRupees(bars[hover].value) }]}
        />
      )}
    </div>
  );
};
