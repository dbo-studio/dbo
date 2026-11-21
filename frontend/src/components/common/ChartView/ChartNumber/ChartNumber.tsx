import { formatNumber, type ChartSpec } from '@/core/charts/chartSpec';
import { Typography } from '@mui/material';
import type { JSX } from 'react';
import { ChartMetricRoot, ChartMetricValue } from '../ChartView.styled';

type Props = {
  rows: Record<string, unknown>[];
  spec: ChartSpec;
};

export default function ChartNumber({ rows, spec }: Props): JSX.Element {
  return (
    <ChartMetricRoot data-testid='ai-chart' data-type='number'>
      <Typography variant='caption' color='textSubdued'>
        {spec.y[0]}
      </Typography>
      <ChartMetricValue>{formatNumber(rows[0]?.[spec.y[0]])}</ChartMetricValue>
    </ChartMetricRoot>
  );
}