import { formatNumber, trendOf, type ChartSpec } from '@/core/charts/chartSpec';
import locales from '@/locales';
import { Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { ChartMetricRoot, ChartMetricValue } from '../ChartView.styled';

type Props = {
  rows: Record<string, unknown>[];
  spec: ChartSpec;
};

export default function ChartTrend({ rows, spec }: Props): JSX.Element {
  const theme = useTheme();
  const { current, previous, change } = trendOf(rows, spec.y[0]);
  const up = (change ?? 0) >= 0;

  return (
    <ChartMetricRoot data-testid='ai-chart' data-type='trend'>
      <Typography variant='caption' color='textSubdued'>
        {spec.y[0]}
      </Typography>
      <ChartMetricValue data-testid='trend-value'>{formatNumber(current)}</ChartMetricValue>
      {change !== null && (
        <Typography
          variant='body2'
          data-testid='trend-change'
          data-direction={up ? 'up' : 'down'}
          sx={{ color: up ? theme.palette.success.main : theme.palette.error.main, fontWeight: 600 }}
        >
          {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%{' '}
          <Typography component='span' variant='caption' color='textSubdued'>
            {locales.ai_chart_trend_from.replace('{value}', formatNumber(previous))}
          </Typography>
        </Typography>
      )}
    </ChartMetricRoot>
  );
}
