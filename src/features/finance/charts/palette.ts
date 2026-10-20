import { useThemeStore } from '../../../store/useThemeStore';

/**
 * Chart colors: the validated reference palette (dataviz skill, references/palette.md), with separate light and dark
 * steps. Categorical slots are assigned in this fixed order and never cycled. Text never wears a series color.
 */
export interface VizPalette {
  series: string[];
  surface: string;
  ink: string;
  inkSecondary: string;
  muted: string;
  grid: string;
  axis: string;
  /** Diverging poles for polarity (money in / money out). */
  positive: string;
  negative: string;
  neutral: string;
}

export const LIGHT: VizPalette = {
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  surface: '#ffffff',
  ink: '#0b0b0b',
  inkSecondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  positive: '#2a78d6',
  negative: '#e34948',
  neutral: '#52514e',
};

export const DARK: VizPalette = {
  series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  surface: '#161617',
  ink: '#f0efec',
  inkSecondary: '#c3c2b7',
  muted: '#898781',
  grid: '#2c2c2a',
  axis: '#383835',
  positive: '#3987e5',
  negative: '#e66767',
  neutral: '#c3c2b7',
};

export const useVizPalette = (): VizPalette => (useThemeStore((state) => state.isDark) ? DARK : LIGHT);

/** Every dark color mapped to its light step: exports always print on white. */
export const darkToLight = (svg: string): string => {
  const pairs: [string, string][] = [];
  DARK.series.forEach((color, i) => pairs.push([color, LIGHT.series[i]]));
  (['surface', 'ink', 'inkSecondary', 'muted', 'grid', 'axis', 'positive', 'negative', 'neutral'] as const).forEach((key) =>
    pairs.push([DARK[key], LIGHT[key]])
  );
  return pairs.reduce((text, [dark, light]) => text.split(dark).join(light), svg);
};
