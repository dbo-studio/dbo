import { formatAxisNumber, formatNumber, MAX_CHART_POINTS, toPlotRows, type ChartSpec } from '@/core/charts/chartSpec';
import locales from '@/locales';
import { Box, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import ChatDataTable from '../AiChatPanel/Messages/ChatDataTable/ChatDataTable';

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
  const tooltip = (
    <Tooltip
      formatter={(value) => formatNumber(value)}
      contentStyle={{
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 6,
        fontSize: theme.typography.caption.fontSize
      }}
    />
  );
  const legend = spec.y.length > 1 ? <Legend wrapperStyle={{ fontSize: theme.typography.caption.fontSize }} /> : null;
  const data = toPlotRows(rows, spec);
  const cut = rows.length > MAX_CHART_POINTS;

  if (rows.length === 0) {
    return (
      <Typography
        variant='caption'
        color='textSubdued'
        sx={{ p: 2, display: 'block' }}
        data-testid='ai-chart'
        data-type='empty'
      >
        {locales.ai_tool_no_rows}
      </Typography>
    );
  }

  if (spec.type === 'table') {
    return (
      <Box data-testid='ai-chart' data-type='table'>
        <ChatDataTable rows={rows} columns={columns} />
      </Box>
    );
  }

  if (spec.type === 'number') {
    return (
      <Box sx={{ p: 2 }} data-testid='ai-chart' data-type='number'>
        <Typography variant='caption' color='textSubdued'>
          {spec.y[0]}
        </Typography>
        <Typography variant='h4' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {formatNumber(rows[0]?.[spec.y[0]])}
        </Typography>
      </Box>
    );
  }

  const cartesian = (children: JSX.Element[]): JSX.Element[] => [
    <CartesianGrid key='grid' stroke={theme.palette.divider} vertical={false} />,
    <XAxis key='x' dataKey={spec.x} tick={axis} stroke={theme.palette.divider} minTickGap={16} />,
    <YAxis key='y' tick={axis} stroke={theme.palette.divider} width={44} tickFormatter={formatAxisNumber} />,
    ...children
  ];

  const chart = (): JSX.Element => {
    switch (spec.type) {
      case 'line':
        return (
          <LineChart data={data}>
            {cartesian(
              spec.y.map((key, index) => (
                <Line
                  key={key}
                  dataKey={key}
                  stroke={palette[index % palette.length]}
                  strokeWidth={2}
                  dot={data.length <= 40}
                  animationDuration={600}
                />
              ))
            )}
            {tooltip}
            {legend}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            {cartesian(
              spec.y.map((key, index) => (
                <Area
                  key={key}
                  dataKey={key}
                  stackId={spec.stacked ? 'stack' : undefined}
                  stroke={palette[index % palette.length]}
                  fill={palette[index % palette.length]}
                  fillOpacity={0.18}
                  animationDuration={600}
                />
              ))
            )}
            {tooltip}
            {legend}
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={spec.y[0]}
              nameKey={spec.x}
              innerRadius='55%'
              outerRadius='85%'
              paddingAngle={1}
              animationDuration={600}
            >
              {data.map((row, index) => (
                <Cell key={formatNumber(row[spec.x ?? ''])} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            {tooltip}
            <Legend wrapperStyle={{ fontSize: theme.typography.caption.fontSize }} />
          </PieChart>
        );
      default:
        return (
          <BarChart data={data}>
            {cartesian(
              spec.y.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId={spec.stacked ? 'stack' : undefined}
                  fill={palette[index % palette.length]}
                  radius={[3, 3, 0, 0]}
                  animationDuration={600}
                  animationEasing='ease-out'
                />
              ))
            )}
            {tooltip}
            {legend}
          </BarChart>
        );
    }
  };

  return (
    <Box data-testid='ai-chart' data-type={spec.type}>
      <Box sx={{ height }}>
        <ResponsiveContainer width='100%' height='100%'>
          {chart()}
        </ResponsiveContainer>
      </Box>
      {cut && (
        <Typography variant='caption' color='textSubdued'>
          {locales.ai_chart_cut.replace('{n}', String(MAX_CHART_POINTS))}
        </Typography>
      )}
    </Box>
  );
}
