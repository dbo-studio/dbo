import { formatNumber, type ChartSpec } from '@/core/charts/chartSpec';
import { variables } from '@/core/theme/variables';
import { alpha, type Theme, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { Legend, Tooltip } from 'recharts';

export type ChartViewTheme = {
  theme: Theme;
  palette: string[];
  gradientId: string;
  axis: { fill: string; fontSize: string | number | undefined };
  grid: { stroke: string; strokeDasharray: string; strokeOpacity: number };
  bare: { axisLine: boolean; tickLine: boolean };
  tooltip: (band: boolean) => JSX.Element;
  barRadius: (
    spec: ChartSpec
  ) => (index: number, radius: [number, number, number, number]) => [number, number, number, number] | number;
  legend: (spec: ChartSpec) => JSX.Element | null;
};

export function useChartViewTheme(gradientId: string): ChartViewTheme {
  const theme = useTheme();

  const palette = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
    theme.palette.secondary.main
  ];

  const axis = { fill: theme.palette.text.secondary, fontSize: theme.typography.caption.fontSize };
  const grid = { stroke: theme.palette.divider, strokeDasharray: '3 3', strokeOpacity: 0.6 };
  const bare = { axisLine: false, tickLine: false };

  const tooltip = (band: boolean): JSX.Element => (
    <Tooltip
      formatter={(value) => formatNumber(value)}
      cursor={band ? { fill: alpha(theme.palette.primary.main, 0.08) } : { stroke: theme.palette.divider }}
      contentStyle={{
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: variables.radius.medium,
        boxShadow: theme.shadows[4],
        fontSize: theme.typography.caption.fontSize
      }}
    />
  );

  const barRadius =
    (spec: ChartSpec) =>
    (index: number, radius: [number, number, number, number]): [number, number, number, number] | number =>
      !spec.stacked || index === spec.y.length - 1 ? radius : 0;

  const legend = (spec: ChartSpec): JSX.Element | null =>
    spec.y.length > 1 ? <Legend wrapperStyle={{ fontSize: theme.typography.caption.fontSize }} /> : null;

  return { theme, palette, gradientId, axis, grid, bare, tooltip, barRadius, legend };
}