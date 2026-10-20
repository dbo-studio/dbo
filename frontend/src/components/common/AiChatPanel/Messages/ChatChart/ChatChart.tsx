import { useTheme } from '@mui/material';
import type { JSX } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartSeries } from '../../utils/chartSeries';

/** Bar chart of an aggregate result, in the theme's colours. */
export default function ChatChart({
  rows,
  series
}: {
  rows: Record<string, unknown>[];
  series: ChartSeries;
}): JSX.Element {
  const theme = useTheme();
  const colors = [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main];
  const axis = { fill: theme.palette.text.secondary, fontSize: theme.typography.caption.fontSize };

  return (
    <div style={{ height: 200 }} data-testid='ai-chart'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.palette.divider} vertical={false} />
          <XAxis dataKey={series.labelKey} tick={axis} stroke={theme.palette.divider} />
          <YAxis tick={axis} stroke={theme.palette.divider} width={40} />
          <Tooltip
            contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}
          />
          {series.valueKeys.length > 1 && <Legend />}
          {series.valueKeys.map((key, index) => (
            <Bar key={key} dataKey={key} fill={colors[index]} animationDuration={600} animationEasing='ease-out' />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
