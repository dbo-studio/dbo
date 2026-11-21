import {
  MAX_CHART_POINTS,
  numericColumns,
  pivotRows,
  toPlotRows,
  type ChartSpec
} from '@/core/charts/chartSpec';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { type JSX, useId } from 'react';
import { ResponsiveContainer } from 'recharts';
import ChartEmpty from './ChartEmpty/ChartEmpty';
import ChartHeatmap from './ChartHeatmap/ChartHeatmap';
import ChartNumber from './ChartNumber/ChartNumber';
import ChartPivot from './ChartPivot/ChartPivot';
import ChartRechartsPlot from './ChartRechartsPlot/ChartRechartsPlot';
import ChartTableFallback from './ChartTableFallback/ChartTableFallback';
import ChartTrend from './ChartTrend/ChartTrend';
import { ChartPlotFrame, ChartPlotRoot } from './ChartView.styled';
import { useChartViewTheme } from './useChartViewTheme';

type ChartViewProps = {
  rows: Record<string, unknown>[];
  columns: string[];
  spec: ChartSpec;
  height?: number;
};

/**
 * The one chart component of the app (chat, reports, boards): Recharts behind the
 * theme's palette, axes, tooltip and legend, light and dark alike.
 */
export default function ChartView({ rows, columns, spec, height = 220 }: ChartViewProps): JSX.Element {
  // useId's colons are not safe inside an SVG url(#…) reference.
  const gradientId = `area${useId().replace(/[^\w-]/g, '')}`;
  const chartTheme = useChartViewTheme(gradientId);
  const data = toPlotRows(rows, spec);
  const cut = rows.length > MAX_CHART_POINTS;

  if (rows.length === 0) {
    return <ChartEmpty />;
  }

  const plottable = spec.y.some((column) => columns.includes(column) && numericColumns(rows, columns).includes(column));
  if (spec.type === 'table' || (spec.type !== 'number' && !plottable)) {
    return <ChartTableFallback rows={rows} columns={columns} />;
  }

  if (spec.type === 'number') {
    return <ChartNumber rows={rows} spec={spec} />;
  }

  if (spec.type === 'trend') {
    return <ChartTrend rows={rows} spec={spec} />;
  }

  if ((spec.type === 'pivot' || spec.type === 'heatmap') && spec.x && spec.group) {
    const pivot = pivotRows(rows, spec.x, spec.group, spec.y[0]);

    if (spec.type === 'pivot') {
      return <ChartPivot rows={pivot.rows} columns={pivot.columns} />;
    }

    return <ChartHeatmap xKey={spec.x} columns={pivot.columns} rows={pivot.rows} />;
  }

  return (
    <ChartPlotRoot data-testid='ai-chart' data-type={spec.type}>
      <ChartPlotFrame $height={height}>
        <ResponsiveContainer width='100%' height='100%'>
          <ChartRechartsPlot spec={spec} data={data} rows={rows} chartTheme={chartTheme} />
        </ResponsiveContainer>
      </ChartPlotFrame>
      {cut && (
        <Typography variant='caption' color='textSubdued'>
          {locales.ai_chart_cut.replace('{n}', String(MAX_CHART_POINTS))}
        </Typography>
      )}
    </ChartPlotRoot>
  );
}