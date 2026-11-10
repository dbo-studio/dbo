import {
  formatAxisNumber,
  formatNumber,
  MAX_CHART_POINTS,
  numericColumns,
  pivotRows,
  toPlotRows,
  trendOf,
  type ChartSpec
} from '@/core/charts/chartSpec';
import locales from '@/locales';
import { alpha, Box, Typography, useTheme } from '@mui/material';
import { type JSX, useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
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
  // useId's colons are not safe inside an SVG url(#…) reference.
  const gradientId = `area${useId().replace(/[^\w-]/g, '')}`;
  const axis = { fill: theme.palette.text.secondary, fontSize: theme.typography.caption.fontSize };
  // Bars highlight their band; lines and areas get a thin guide line.
  const tooltip = (band: boolean): JSX.Element => (
    <Tooltip
      formatter={(value) => formatNumber(value)}
      cursor={band ? { fill: alpha(theme.palette.primary.main, 0.08) } : { stroke: theme.palette.divider }}
      contentStyle={{
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        boxShadow: theme.shadows[4],
        fontSize: theme.typography.caption.fontSize
      }}
    />
  );
  const grid = { stroke: theme.palette.divider, strokeDasharray: '3 3', strokeOpacity: 0.6 };
  const bare = { axisLine: false, tickLine: false };
  // Stacked bars round only the top segment, so the stack reads as one bar.
  const barRadius = (
    index: number,
    radius: [number, number, number, number]
  ): [number, number, number, number] | number => (!spec.stacked || index === spec.y.length - 1 ? radius : 0);
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

  // A chart needs a number column; text-only rows (or a measure that is gone) read as a table instead of a blank plot.
  const plottable = spec.y.some((column) => columns.includes(column) && numericColumns(rows, columns).includes(column));
  if (spec.type === 'table' || (spec.type !== 'number' && !plottable)) {
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

  if (spec.type === 'trend') {
    const { current, previous, change } = trendOf(rows, spec.y[0]);
    const up = (change ?? 0) >= 0;

    return (
      <Box sx={{ p: 2 }} data-testid='ai-chart' data-type='trend'>
        <Typography variant='caption' color='textSubdued'>
          {spec.y[0]}
        </Typography>
        <Typography variant='h4' sx={{ fontWeight: 600, lineHeight: 1.2 }} data-testid='trend-value'>
          {formatNumber(current)}
        </Typography>
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
      </Box>
    );
  }

  if ((spec.type === 'pivot' || spec.type === 'heatmap') && spec.x && spec.group) {
    const pivot = pivotRows(rows, spec.x, spec.group, spec.y[0]);

    if (spec.type === 'pivot') {
      return (
        <Box data-testid='ai-chart' data-type='pivot'>
          <ChatDataTable rows={pivot.rows} columns={pivot.columns} />
        </Box>
      );
    }

    const values = pivot.rows.flatMap((row) => pivot.columns.slice(1).map((column) => Number(row[column] ?? NaN)));
    const finite = values.filter(Number.isFinite);
    const [low, high] = [Math.min(...finite), Math.max(...finite)];

    return (
      <Box sx={{ p: 1, overflow: 'auto' }} data-testid='ai-chart' data-type='heatmap'>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `minmax(80px, auto) repeat(${pivot.columns.length - 1}, minmax(48px, 1fr))`,
            gap: '2px',
            fontSize: theme.typography.caption.fontSize
          }}
        >
          <Box />
          {pivot.columns.slice(1).map((column) => (
            <Typography key={column} variant='caption' color='textSubdued' noWrap sx={{ textAlign: 'center' }}>
              {column}
            </Typography>
          ))}
          {pivot.rows.map((row) => [
            <Typography key={`${formatNumber(row[spec.x ?? ''])}-label`} variant='caption' color='textSubdued' noWrap>
              {formatNumber(row[spec.x ?? ''])}
            </Typography>,
            ...pivot.columns.slice(1).map((column) => {
              const value = Number(row[column] ?? NaN);
              const shade = Number.isFinite(value) && high > low ? 0.12 + 0.88 * ((value - low) / (high - low)) : 0.12;

              return (
                <Box
                  key={`${formatNumber(row[spec.x ?? ''])}-${column}`}
                  data-testid='heatmap-cell'
                  title={`${formatNumber(row[spec.x ?? ''])} / ${column}: ${formatNumber(value)}`}
                  sx={{
                    minHeight: 28,
                    borderRadius: 0.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: Number.isFinite(value) ? alpha(theme.palette.primary.main, shade) : 'action.hover',
                    color: shade > 0.55 ? theme.palette.primary.contrastText : theme.palette.text.primary
                  }}
                >
                  {Number.isFinite(value) ? formatAxisNumber(value) : ''}
                </Box>
              );
            })
          ])}
        </Box>
      </Box>
    );
  }

  const cartesian = (children: JSX.Element[]): JSX.Element[] => [
    <CartesianGrid key='grid' {...grid} vertical={false} />,
    <XAxis key='x' dataKey={spec.x} tick={axis} {...bare} minTickGap={16} />,
    <YAxis key='y' tick={axis} {...bare} width={44} tickFormatter={formatAxisNumber} />,
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
                  type='monotone'
                  dataKey={key}
                  stroke={palette[index % palette.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={600}
                />
              ))
            )}
            {tooltip(false)}
            {legend}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              {spec.y.map((key, index) => (
                <linearGradient key={key} id={`${gradientId}-${index}`} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor={palette[index % palette.length]} stopOpacity={0.35} />
                  <stop offset='100%' stopColor={palette[index % palette.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {cartesian(
              spec.y.map((key, index) => (
                <Area
                  key={key}
                  type='monotone'
                  dataKey={key}
                  stackId={spec.stacked ? 'stack' : undefined}
                  stroke={palette[index % palette.length]}
                  strokeWidth={2}
                  fill={`url(#${gradientId}-${index})`}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={600}
                />
              ))
            )}
            {tooltip(false)}
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
              innerRadius='60%'
              outerRadius='85%'
              paddingAngle={2}
              cornerRadius={4}
              stroke='none'
              animationDuration={600}
            >
              {data.map((row, index) => (
                <Cell key={formatNumber(row[spec.x ?? ''])} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            {tooltip(false)}
            <Legend wrapperStyle={{ fontSize: theme.typography.caption.fontSize }} />
          </PieChart>
        );
      case 'combo':
        return (
          <ComposedChart data={data}>
            {cartesian([
              <Bar
                key={spec.y[0]}
                dataKey={spec.y[0]}
                fill={palette[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                animationDuration={600}
              />,
              ...spec.y
                .slice(1)
                .map((key, index) => (
                  <Line
                    key={key}
                    type='monotone'
                    dataKey={key}
                    stroke={palette[(index + 1) % palette.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    animationDuration={600}
                  />
                ))
            ])}
            {tooltip(true)}
            {legend}
          </ComposedChart>
        );
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid {...grid} />
            <XAxis
              type='number'
              dataKey={spec.x}
              name={spec.x}
              tick={axis}
              {...bare}
              tickFormatter={formatAxisNumber}
            />
            <YAxis
              type='number'
              dataKey={spec.y[0]}
              name={spec.y[0]}
              tick={axis}
              {...bare}
              width={44}
              tickFormatter={formatAxisNumber}
            />
            {spec.size && <ZAxis type='number' dataKey={spec.size} name={spec.size} range={[40, 400]} />}
            {tooltip(false)}
            <Scatter data={data} fill={palette[0]} fillOpacity={0.7} animationDuration={600} />
          </ScatterChart>
        );
      case 'funnel': {
        const stages = [...data].sort((a, b) => Number(b[spec.y[0]]) - Number(a[spec.y[0]]));

        return (
          <FunnelChart>
            {tooltip(false)}
            <Funnel data={stages} dataKey={spec.y[0]} nameKey={spec.x} isAnimationActive={false}>
              {stages.map((row, index) => (
                <Cell key={formatNumber(row[spec.x ?? ''])} fill={palette[index % palette.length]} />
              ))}
              <LabelList position='right' dataKey={spec.x} fill={theme.palette.text.primary} stroke='none' />
            </Funnel>
          </FunnelChart>
        );
      }
      case 'gauge': {
        const value = Number(rows[0]?.[spec.y[0]]);
        const goal = spec.goal && spec.goal > 0 ? spec.goal : value <= 100 ? 100 : value;

        return (
          <RadialBarChart
            data={[{ name: spec.y[0], value: Math.min(value, goal) }]}
            innerRadius='70%'
            outerRadius='100%'
            startAngle={210}
            endAngle={-30}
          >
            <PolarAngleAxis type='number' domain={[0, goal]} tick={false} />
            <RadialBar
              dataKey='value'
              cornerRadius={8}
              fill={palette[0]}
              background={{ fill: alpha(palette[0], 0.15) }}
            />
            <text
              x='50%'
              y='50%'
              textAnchor='middle'
              dominantBaseline='middle'
              fill={theme.palette.text.primary}
              fontSize={theme.typography.h5.fontSize}
              data-testid='gauge-value'
            >
              {`${formatNumber(value)} / ${formatNumber(goal)}`}
            </text>
          </RadialBarChart>
        );
      }
      case 'row':
        return (
          <BarChart data={data} layout='vertical' barCategoryGap='25%'>
            <CartesianGrid {...grid} horizontal={false} />
            <XAxis type='number' tick={axis} {...bare} tickFormatter={formatAxisNumber} />
            <YAxis type='category' dataKey={spec.x} tick={axis} {...bare} width={96} />
            {spec.y.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId={spec.stacked ? 'stack' : undefined}
                fill={palette[index % palette.length]}
                radius={barRadius(index, [0, 4, 4, 0])}
                maxBarSize={32}
                animationDuration={600}
              />
            ))}
            {tooltip(true)}
            {legend}
          </BarChart>
        );
      default:
        return (
          <BarChart data={data} barCategoryGap='25%'>
            {cartesian(
              spec.y.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId={spec.stacked ? 'stack' : undefined}
                  fill={palette[index % palette.length]}
                  radius={barRadius(index, [4, 4, 0, 0])}
                  maxBarSize={32}
                  animationDuration={600}
                  animationEasing='ease-out'
                />
              ))
            )}
            {tooltip(true)}
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
