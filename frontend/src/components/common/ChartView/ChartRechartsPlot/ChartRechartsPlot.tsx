import { formatAxisNumber, formatNumber, type ChartSpec } from '@/core/charts/chartSpec';
import { alpha } from '@mui/material';
import type { JSX } from 'react';
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
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis
} from 'recharts';
import type { ChartViewTheme } from '../useChartViewTheme';

type Props = {
  spec: ChartSpec;
  data: Record<string, unknown>[];
  rows: Record<string, unknown>[];
  chartTheme: ChartViewTheme;
};

export default function ChartRechartsPlot({ spec, data, rows, chartTheme }: Props): JSX.Element {
  const { theme, palette, gradientId, axis, grid, bare, tooltip, barRadius, legend } = chartTheme;
  const radiusFor = barRadius(spec);

  const cartesian = (children: JSX.Element[]): JSX.Element[] => [
    <CartesianGrid key='grid' {...grid} vertical={false} />,
    <XAxis key='x' dataKey={spec.x} tick={axis} {...bare} minTickGap={16} />,
    <YAxis key='y' tick={axis} {...bare} width={44} tickFormatter={formatAxisNumber} />,
    ...children
  ];

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
          {legend(spec)}
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
          {legend(spec)}
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
            ...spec.y.slice(1).map((key, index) => (
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
          {legend(spec)}
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
              radius={radiusFor(index, [0, 4, 4, 0])}
              maxBarSize={32}
              animationDuration={600}
            />
          ))}
          {tooltip(true)}
          {legend(spec)}
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
                radius={radiusFor(index, [4, 4, 0, 0])}
                maxBarSize={32}
                animationDuration={600}
                animationEasing='ease-out'
              />
            ))
          )}
          {tooltip(true)}
          {legend(spec)}
        </BarChart>
      );
  }
}