import { formatAxisNumber, formatNumber } from '@/core/charts/chartSpec';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';
import { ChartHeatmapCell, ChartHeatmapGrid, ChartHeatmapHeaderCell, ChartHeatmapRoot } from '../ChartView.styled';

type Props = {
  xKey: string;
  columns: string[];
  rows: Record<string, unknown>[];
};

export default function ChartHeatmap({ xKey, columns, rows }: Props): JSX.Element {
  const values = rows.flatMap((row) => columns.slice(1).map((column) => Number(row[column] ?? NaN)));
  const finite = values.filter(Number.isFinite);
  const [low, high] = [Math.min(...finite), Math.max(...finite)];

  return (
    <ChartHeatmapRoot data-testid='ai-chart' data-type='heatmap'>
      <ChartHeatmapGrid $columnCount={columns.length - 1}>
        <Box />
        {columns.slice(1).map((column) => (
          <ChartHeatmapHeaderCell key={column} variant='caption' color='textSubdued' noWrap>
            {column}
          </ChartHeatmapHeaderCell>
        ))}
        {rows.map((row) => [
          <Typography key={`${formatNumber(row[xKey])}-label`} variant='caption' color='textSubdued' noWrap>
            {formatNumber(row[xKey])}
          </Typography>,
          ...columns.slice(1).map((column) => {
            const value = Number(row[column] ?? NaN);
            const shade = Number.isFinite(value) && high > low ? 0.12 + 0.88 * ((value - low) / (high - low)) : 0.12;

            return (
              <ChartHeatmapCell
                key={`${formatNumber(row[xKey])}-${column}`}
                data-testid='heatmap-cell'
                title={`${formatNumber(row[xKey])} / ${column}: ${formatNumber(value)}`}
                $shade={shade}
                $finite={Number.isFinite(value)}
              >
                {Number.isFinite(value) ? formatAxisNumber(value) : ''}
              </ChartHeatmapCell>
            );
          })
        ])}
      </ChartHeatmapGrid>
    </ChartHeatmapRoot>
  );
}
